import { beforeEach, describe, expect, it } from "vitest";
import { useDocuments } from "../../src/store/documents";
import { useUi } from "../../src/store/ui";
import { fighter } from "../fixtures/characters";
import { installTestEngine, resetStores } from "../helpers/app";

const engine = installTestEngine(11);
const docs = () => useDocuments.getState();

beforeEach(resetStores);

async function storedFighter(level = 1) {
  const build = await fighter(engine, level);
  const result = await docs().importCharacter(build);
  if (!result.ok) throw new Error(result.reasons.join("; "));
  return result.id;
}

describe("documents store", () => {
  it("commits the build the engine returns, and reconciles the state", async () => {
    const id = await docs().createCharacter();
    const result = await docs().editBuild(id, { type: "class", id: "wizard" });
    expect(result.ok).toBe(true);
    expect(docs().characters[id]?.build.class_id).toBe("wizard");
    expect(docs().revs[id]).toBeGreaterThan(1);
  });

  it("leaves the document untouched on a refusal and returns the reasons", async () => {
    const id = await storedFighter();
    const before = docs().characters[id];
    const result = await docs().editBuild(id, {
      type: "choice",
      key: "class:fighter#skills",
      values: ["athletics", "athletics"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasons.length).toBeGreaterThan(0);
    expect(docs().characters[id]).toBe(before);
  });

  it("applies play actions and shows their notes", async () => {
    const id = await storedFighter();
    const hit = await docs().playAction(id, { type: "damage", amount: 5, damage_type: "slashing" });
    expect(hit.ok).toBe(true);
    expect(docs().characters[id]?.state.hp.current).not.toBeNull();
    await docs().playAction(id, { type: "use_feature", key: "fighter:second-wind" });
    expect(useUi.getState().toasts.at(-1)?.lines.join(" ")).toMatch(/Second Wind/);
  });

  it("undoes and redoes a character change", async () => {
    const id = await storedFighter();
    await docs().playAction(id, { type: "damage", amount: 4 });
    const hurt = docs().characters[id]?.state;
    docs().undo(id);
    expect(docs().characters[id]?.state.hp.current).toBeNull();
    docs().redo(id);
    expect(docs().characters[id]?.state).toEqual(hurt);
  });

  it("sends an encounter its party, writes changed states back, and undoes them together", async () => {
    const aerin = await storedFighter(3);
    const eid = await docs().createEncounter("Test");
    const setup = await docs().encounterAction(eid, [
      { type: "add_character", character: aerin },
      { type: "add_monster", monster: "goblin-warrior" },
      { type: "set_initiative", id: "goblin-warrior", value: 20 },
      { type: "set_initiative", id: "aerin", value: 1 },
      { type: "start" },
    ]);
    expect(setup.ok).toBe(true);
    const encounter = docs().encounters[eid]?.encounter;
    expect(encounter?.combatants.map((c) => c.id)).toEqual(["aerin", "goblin-warrior"]);

    // The goblin attacks until it hits, so Aerin's state changes through the encounter.
    let hit = false;
    for (let i = 0; i < 10 && !hit; i++) {
      const before = docs().characters[aerin]?.state.hp.current;
      await docs().encounterAction(eid, [
        { type: "attack", id: "goblin-warrior", target: "aerin", attack: "Scimitar" },
      ]);
      hit = docs().characters[aerin]?.state.hp.current !== before;
      if (!hit) {
        await docs().encounterAction(eid, [{ type: "next_turn" }, { type: "next_turn" }]);
      }
    }
    expect(hit).toBe(true);
    const log = docs().encounters[eid]?.log ?? [];
    expect(log.some((e) => e.lines.some((l) => /Goblin Warrior/.test(l)))).toBe(true);
    expect(useUi.getState().dice.length).toBeGreaterThan(0);

    const hurt = docs().characters[aerin]?.state.hp.current;
    docs().undo(eid);
    expect(docs().characters[aerin]?.state.hp.current).not.toBe(hurt);
  });

  it("refuses an encounter action with the engine's reason", async () => {
    const eid = await docs().createEncounter("Empty");
    const result = await docs().encounterAction(eid, { type: "next_turn" });
    expect(result.ok).toBe(false);
  });

  it("imports refuse documents that don't parse", async () => {
    const result = await docs().importCharacter({ version: 999 });
    expect(result.ok).toBe(false);
    expect(Object.keys(docs().characters)).toHaveLength(0);
  });
});
