import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useDocuments } from "../../src/store/documents";
import { fighter } from "../fixtures/characters";
import { installTestEngine, renderApp, resetStores } from "../helpers/app";

const engine = installTestEngine(5);
beforeEach(resetStores);

async function soldierFighter() {
  let build = await engine.newBuild();
  for (const edit of [
    { type: "class", id: "fighter" },
    { type: "species", id: "human" },
    { type: "background", id: "soldier" },
  ] as const) {
    const r = await engine.editBuild(build, edit);
    if (!r.ok) throw new Error(r.reasons.join("; "));
    build = r.build;
  }
  const imported = await useDocuments.getState().importCharacter(build);
  if (!imported.ok) throw new Error(imported.reasons.join("; "));
  return imported.id;
}

describe("builder", () => {
  it("shows an unavailable option with the engine's reason, and stores a pick", async () => {
    const id = await soldierFighter();
    await renderApp(`/characters/${id}/build?step=proficiencies`);
    const card = await screen.findByRole("region", { name: "Fighter skills" }, { timeout: 10_000 });

    const athletics = within(card).getByRole("button", { name: /^Athletics/ });
    expect(athletics).toHaveAttribute("aria-disabled", "true");
    expect(athletics).toHaveAccessibleDescription(/already proficient from Soldier/);

    await userEvent.click(athletics);
    expect(
      useDocuments.getState().characters[id]?.build.choices["class:fighter#skills"],
    ).toBeUndefined();

    await userEvent.click(within(card).getByRole("button", { name: /^History/ }));
    await waitFor(() =>
      expect(useDocuments.getState().characters[id]?.build.choices["class:fighter#skills"]).toEqual(
        ["history"],
      ),
    );
  });

  it("lists the engine's steps with what's missing", async () => {
    const id = await soldierFighter();
    await renderApp(`/characters/${id}/build?step=abilities`);
    const nav = await screen.findByRole("navigation", { name: "Steps" }, { timeout: 10_000 });
    expect(
      within(nav)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Class/),
        expect.stringMatching(/Name & Alignment/),
      ]),
    );
    expect(await screen.findByText("Choose how to generate ability scores")).toBeInTheDocument();
  });

  it("picks an ability score method and assigns the standard array", async () => {
    const id = await soldierFighter();
    await renderApp(`/characters/${id}/build?step=abilities`);
    await userEvent.click(
      await screen.findByRole("button", { name: "Standard array" }, { timeout: 10_000 }),
    );
    const strength = await screen.findByLabelText("Strength: Base");
    await userEvent.selectOptions(strength, "15");
    await waitFor(() =>
      expect(useDocuments.getState().characters[id]?.build.base_scores.str).toBe(15),
    );
    // Other abilities are offered only the engine's unassigned values.
    const values = (label: string) =>
      within(screen.getByLabelText(label))
        .getAllByRole("option")
        .map((o) => o.textContent);
    await waitFor(() =>
      expect(values("Dexterity: Base")).toEqual(["—", "14", "13", "12", "10", "8"]),
    );
    expect(values("Strength: Base")).toEqual(["—", "15", "14", "13", "12", "10", "8"]);
  });

  it("shows what an option would change on the sheet (previewOption)", async () => {
    const build = await fighter(engine, 1);
    const imported = await useDocuments.getState().importCharacter(build);
    if (!imported.ok) throw new Error(imported.reasons.join("; "));
    const view = await engine.evaluate(build);
    const style = view.choices.find((c) => c.options.some((o) => o.id === "defense"));
    if (!style) throw new Error("no fighting style choice");
    const previews = await engine.optionPreviews(build, style.key);
    const ac = previews.defense?.find((c) => c.stat === "armor_class");
    expect(ac && ac.after - ac.before).toBe(1);

    await renderApp(`/characters/${imported.id}/build?step=${style.step}`);
    const card = await screen.findByRole("region", { name: style.label }, { timeout: 10_000 });
    const defense = within(card).getByRole("button", { name: /^Defense/ });
    await waitFor(() => expect(defense).toHaveTextContent(`AC ${ac?.before} → ${ac?.after}`));
  });
});
