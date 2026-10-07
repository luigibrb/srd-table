import { describe, expect, it } from "vitest";
import { nodeFacade } from "../../src/engine/node";

const engine = nodeFacade({ seed: 7 });

async function fighter() {
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
  return build;
}

describe("in-process facade", () => {
  it("evaluates a build into JSON views", async () => {
    const view = await engine.evaluate(await fighter());
    expect(view.level).toBe(1);
    expect(view.steps.map((s) => s.step)).toContain("abilities");
    const skills = view.choices.find((c) => c.key === "class:fighter#skills");
    expect(skills?.options.find((o) => o.id === "athletics")?.unavailable).toMatch(/Soldier/);
    expect(structuredClone(view)).toEqual(view);
  });

  it("returns a refusal with the engine's reasons", async () => {
    const r = await engine.editBuild(await fighter(), {
      type: "choice",
      key: "class:fighter#skills",
      values: ["athletics", "history"],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons[0]).toMatch(/Athletics/);
  });

  it("plays and fights through the facade", async () => {
    const build = await fighter();
    const state = await engine.createState(build);
    const hurt = await engine.applyPlayAction(build, state, { type: "damage", amount: 3 });
    expect(hurt.ok).toBe(true);
    const party = { aerin: { build, state } };
    let encounter = await engine.newEncounter();
    const setup = await engine.applyEncounterAction(encounter, party, [
      { type: "add_character", character: "aerin" },
      { type: "add_monster", monster: "goblin-warrior" },
      { type: "roll_initiative" },
      { type: "start" },
    ]);
    expect(setup.ok).toBe(true);
    if (!setup.ok) return;
    encounter = setup.encounter;
    const view = await engine.encounterView(encounter, party);
    expect(view.combatants).toHaveLength(2);
    expect(view.current).not.toBeNull();
    const options = await engine.combatantOptions(encounter, party, "goblin-warrior");
    expect(options.standard.length).toBeGreaterThan(0);
    const bad = await engine.applyEncounterAction(encounter, party, { type: "next_turn" });
    expect(bad.ok).toBe(true);
  });

  it("rolls with the worker's dice and refuses bad expressions", async () => {
    const r = await engine.roll("2d6+3");
    expect(r.ok && r.roll.total).toBeGreaterThanOrEqual(5);
    const bad = await engine.roll("2q6");
    expect(bad.ok).toBe(false);
  });

  it("parses and refuses documents", async () => {
    expect((await engine.parseBuild({ class_id: "wizard" })).ok).toBe(true);
    const bad = await engine.parseBuild({ version: 99 });
    expect(bad.ok).toBe(false);
  });
});

describe("content tiers", () => {
  it("loads spells only when a build needs them", async () => {
    const files: string[] = [];
    const { createInProcessFacade } = await import("../../src/engine/facade");
    const { readFile } = await import("node:fs/promises");
    const { createRequire } = await import("node:module");
    const { dirname, join } = await import("node:path");
    const dir = dirname(
      createRequire(import.meta.url).resolve("srd-rules-engine/srd-5.2.1/manifest.json"),
    );
    const facade = createInProcessFacade({
      seed: 1,
      fetchFile: async (_pack, file) => {
        files.push(file);
        return JSON.parse(await readFile(join(dir, file), "utf8"));
      },
    });
    const build = await facade.editBuild(await facade.newBuild(), { type: "class", id: "fighter" });
    if (!build.ok) throw new Error("class");
    await facade.evaluate(build.build);
    expect(files).not.toContain("monsters.json");
    expect(files).toContain("classes.json");
    const before = files.length;
    await facade.entries("monsters");
    expect(files.slice(before)).toContain("monsters.json");
    // Each file is fetched once.
    await facade.entries("monsters");
    expect(files.filter((f) => f === "monsters.json")).toHaveLength(1);
  });
});

describe("map helpers", () => {
  it("previews areas and moves with the engine, and measures with gridDistance", async () => {
    const r = await engine.applyEncounterAction(await engine.newEncounter(), {}, [
      { type: "add_monster", monster: "adult-red-dragon" },
      { type: "add_monster", monster: "goblin-warrior" },
      { type: "place", id: "adult-red-dragon", x: 0, y: 0 },
      { type: "place", id: "goblin-warrior", x: 8, y: 1 },
      { type: "set_initiative", id: "adult-red-dragon", value: 20 },
      { type: "set_initiative", id: "goblin-warrior", value: 1 },
      { type: "start" },
    ]);
    if (!r.ok) throw new Error(r.reasons.join("; "));
    const cone = await engine.previewArea(
      r.encounter,
      {},
      {
        id: "adult-red-dragon",
        ability: "Fire Breath",
        area: { toward: { x: 8, y: 1 } },
      },
    );
    expect(cone.ok).toBe(true);
    expect(cone.targets.map((x) => x.id)).toContain("goblin-warrior");
    const reach = await engine.reachable(r.encounter, {}, "adult-red-dragon");
    expect(reach.movement).toBe(40);
    expect(reach.squares.length).toBeGreaterThan(0);
    const move = await engine.previewMove(
      r.encounter,
      {},
      { id: "adult-red-dragon", to: { x: 3, y: 0 } },
    );
    expect(move.ok).toBe(true);
    expect(move.path.at(-1)).toEqual({ x: 3, y: 0 });
    expect(await engine.distance({ x: 0, y: 0 }, { x: 3, y: 1 })).toBe(15);
    expect(await engine.squaresWithin(r.encounter, {}, "goblin-warrior", 5)).toHaveLength(8);
    // The dragon is Huge: 3×3 squares, so 16 squares are within 5 feet of its space.
    expect(await engine.squaresWithin(r.encounter, {}, "adult-red-dragon", 5)).toHaveLength(16);
    const view = await engine.encounterView(r.encounter, {});
    expect(view.combatants.find((c) => c.id === "adult-red-dragon")?.space).toBe(3);
  });

  it("gives the skills each check action takes, from the engine's schema", async () => {
    const c = await engine.constants();
    expect(c.check_skills.influence).toContain("persuasion");
    expect(c.skills.find((s) => s.id === "stealth")?.ability).toBe("dex");
  });
});
