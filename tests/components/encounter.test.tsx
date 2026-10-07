import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Encounter } from "srd-rules-engine";
import { beforeEach, describe, expect, it } from "vitest";
import { setEngine } from "../../src/engine/client";
import { nodeFacade } from "../../src/engine/node";
import { useTableUi } from "../../src/features/encounter/tableUi";
import { newId, useDocuments } from "../../src/store/documents";
import { useUi } from "../../src/store/ui";
import { fighter } from "../fixtures/characters";
import { installTestEngine, renderApp, resetStores } from "../helpers/app";

const engine = installTestEngine(13);
beforeEach(async () => {
  await resetStores();
  setEngine(engine);
});

function storeEncounter(encounter: Encounter): string {
  const id = newId("e");
  useDocuments.setState((s) => ({
    encounters: {
      ...s.encounters,
      [id]: { id, name: "Test", encounter, log: [], created: 0, updated: 0 },
    },
    revs: { ...s.revs, [id]: 1 },
  }));
  return id;
}

describe("encounter table", () => {
  it("lists the acting combatant's options, unavailable ones with the engine's reason", async () => {
    const aerin = await useDocuments.getState().importCharacter(await fighter(engine, 3));
    if (!aerin.ok) throw new Error("import");
    const record = useDocuments.getState().characters[aerin.id];
    if (!record) throw new Error("import");
    const party = { [aerin.id]: { build: record.build, state: record.state } };
    const r = await engine.applyEncounterAction(await engine.newEncounter(), party, [
      { type: "add_character", character: aerin.id },
      { type: "add_monster", monster: "goblin-warrior" },
      { type: "set_initiative", id: "aerin", value: 20 },
      { type: "set_initiative", id: "goblin-warrior", value: 5 },
      { type: "start" },
    ]);
    if (!r.ok) throw new Error(r.reasons.join("; "));
    const id = storeEncounter(r.encounter);
    await renderApp(`/encounters/${id}`);

    const options = await screen.findByRole("region", { name: "Options" }, { timeout: 15_000 });
    // Dodge has nothing to fill in: it's sent at once, and the log shows the engine's note.
    await userEvent.click(within(options).getByRole("button", { name: /^Dodge/ }));
    await waitFor(() =>
      expect(useDocuments.getState().encounters[id]?.encounter.combatants[0]?.dodging).toBe(true),
    );
    expect(await screen.findByRole("region", { name: "Log" })).toHaveTextContent(/Dodge/);

    // With the action spent, the Action tiles stay listed, greyed, each with the engine's reason.
    const after = await screen.findByRole("region", { name: "Options" });
    await waitFor(() => {
      const disabled = within(after)
        .getAllByRole("button")
        .filter((b) => b.getAttribute("aria-disabled") === "true");
      expect(disabled.length).toBeGreaterThan(0);
      for (const tile of disabled) expect(tile).toHaveAccessibleDescription(/.+/);
    });
  });

  it("asks a decision after a roll and answers it with decide", async () => {
    // Find dice where the blue dragon fails its save against the red dragon's breath.
    let found: { encounter: Encounter; seed: number } | null = null;
    for (let seed = 1; seed < 200 && !found; seed++) {
      const e = nodeFacade({ seed });
      const r = await e.applyEncounterAction(await e.newEncounter({ decisions: "ask" }), {}, [
        { type: "add_monster", monster: "adult-red-dragon" },
        { type: "add_monster", monster: "adult-blue-dragon" },
        { type: "set_initiative", id: "adult-red-dragon", value: 20 },
        { type: "set_initiative", id: "adult-blue-dragon", value: 5 },
        { type: "start" },
        {
          type: "save_action",
          id: "adult-red-dragon",
          ability: "Fire Breath",
          targets: ["adult-blue-dragon"],
        },
      ]);
      if (r.ok && r.pending) found = { encounter: r.encounter, seed };
    }
    if (!found) throw new Error("no seed gives a failed save");
    setEngine(nodeFacade({ seed: found.seed }));
    const id = storeEncounter(found.encounter);
    await renderApp(`/encounters/${id}`);

    const dialog = await screen.findByRole("dialog", {}, { timeout: 15_000 });
    expect(dialog).toHaveTextContent(found.encounter.pending?.question ?? "");
    // The recommendation is pre-selected (focused), not applied.
    expect(useDocuments.getState().encounters[id]?.encounter.pending).not.toBeNull();
    await userEvent.click(within(dialog).getByRole("button", { name: /Yes, use it/ }));
    await waitFor(() =>
      expect(useDocuments.getState().encounters[id]?.encounter.pending).toBeNull(),
    );
    expect(
      useDocuments.getState().encounters[id]?.encounter.combatants[1]?.legendary_resistance_used,
    ).toBe(1);
  });

  it("hides monsters' HP numbers from a player", async () => {
    const r = await engine.applyEncounterAction(await engine.newEncounter(), {}, [
      { type: "add_monster", monster: "goblin-warrior" },
    ]);
    if (!r.ok) throw new Error("setup");
    const id = storeEncounter(r.encounter);
    useUi.setState({ role: { kind: "player", character: null } });
    await renderApp(`/encounters/${id}`);
    const rail = await screen.findByRole("navigation", { name: "Initiative" }, { timeout: 15_000 });
    expect(rail).toHaveTextContent("Goblin Warrior");
    expect(rail).not.toHaveTextContent("10/10");
  });

  it("warns when the acting combatant is off a map in use, places it, and ends the turn", async () => {
    const r = await engine.applyEncounterAction(await engine.newEncounter(), {}, [
      { type: "add_monster", monster: "goblin-warrior" },
      { type: "add_monster", monster: "zombie" },
      { type: "place", id: "goblin-warrior", x: 2, y: 2 },
      { type: "set_initiative", id: "zombie", value: 20 },
      { type: "set_initiative", id: "goblin-warrior", value: 5 },
      { type: "start" },
    ]);
    if (!r.ok) throw new Error(r.reasons.join("; "));
    const id = storeEncounter(r.encounter);
    await renderApp(`/encounters/${id}`);

    const notice = await screen.findByText(/Zombie isn't on the map/, {}, { timeout: 15_000 });
    await userEvent.click(
      within(notice.closest("[role=status]") as HTMLElement).getByRole("button", {
        name: "Place Zombie",
      }),
    );
    expect(useTableUi.getState()).toMatchObject({ selected: "zombie", tool: "place" });

    const options = await screen.findByRole("region", { name: "Options" });
    await userEvent.click(within(options).getByRole("button", { name: "End turn" }));
    await waitFor(() => expect(useDocuments.getState().encounters[id]?.encounter.turn).toBe(1));
  });

  it("explores outside a fight: the GM's pace, a halt answered, a point revealed", async () => {
    const aerin = await useDocuments.getState().importCharacter(await fighter(engine, 3));
    if (!aerin.ok) throw new Error("import");
    const record = useDocuments.getState().characters[aerin.id];
    if (!record) throw new Error("import");
    const party = { [aerin.id]: { build: record.build, state: record.state } };
    const r = await engine.applyEncounterAction(await engine.newEncounter(), party, [
      { type: "add_character", character: aerin.id },
      { type: "place", id: "aerin", x: 0, y: 0 },
      { type: "set_exploration", notice_stops: "everyone" },
      // DC 0 next to Aerin: noticed at once, and everyone waits.
      { type: "add_point", at: { x: 1, y: 0 }, title: "Loose flagstone", kind: "trap", dc: 0 },
    ]);
    if (!r.ok) throw new Error(r.reasons.join("; "));
    const id = storeEncounter(r.encounter);
    await renderApp(`/encounters/${id}`);

    const explore = await screen.findByRole("region", { name: "Exploration" }, { timeout: 15_000 });
    expect(explore).toHaveTextContent("Everyone waits: Aerin noticed something.");
    await userEvent.click(within(explore).getByRole("button", { name: "Fast" }));
    await waitFor(() =>
      expect(useDocuments.getState().encounters[id]?.encounter.pace).toBe("fast"),
    );

    // The GM opens the noticed point from the halt and reveals it: the halt ends.
    await userEvent.click(within(explore).getByRole("button", { name: "Open the point" }));
    const panel = await screen.findByRole("region", { name: "Loose flagstone" });
    expect(panel).toHaveTextContent("Noticed by Aerin.");
    await userEvent.click(within(panel).getByRole("button", { name: "Reveal" }));
    await waitFor(() => {
      const e = useDocuments.getState().encounters[id]?.encounter;
      expect(e?.points[0]?.revealed).toBe(true);
      expect(e?.halted).toBeNull();
    });
  });

  it("hides points the GM hasn't revealed from players", async () => {
    const r = await engine.applyEncounterAction(await engine.newEncounter(), {}, [
      { type: "add_monster", monster: "goblin-warrior" },
      { type: "add_point", at: { x: 2, y: 2 }, title: "Secret door", kind: "door" },
      { type: "add_point", at: { x: 4, y: 2 }, title: "Old well", revealed: true },
    ]);
    if (!r.ok) throw new Error("setup");
    const id = storeEncounter(r.encounter);
    useUi.setState({ role: { kind: "player", character: null } });
    await renderApp(`/encounters/${id}`);
    const map = await screen.findByRole("region", { name: "Map" }, { timeout: 15_000 });
    expect(within(map).getByRole("button", { name: "Old well" })).toBeInTheDocument();
    expect(within(map).queryByRole("button", { name: /Secret door/ })).toBeNull();
  });
});
