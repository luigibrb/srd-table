/**
 * The engine facade: every rules operation the app uses, JSON in and JSON out, mirroring the
 * engine's functions and HTTP routes. One implementation runs in-process (tests, and inside the
 * worker); `client.ts` reaches it over Comlink. Keep signatures plain data so an HTTP
 * implementation (`createHandler` routes) stays a drop-in.
 *
 * This folder is the only importer of `srd-rules-engine` functions; types come from anywhere.
 */

import {
  ABILITIES,
  ABILITY_NAMES,
  type Ability,
  type AbilityMap,
  type AbilityMethod,
  type AbilityRoll,
  type ActionCheck,
  ALIGNMENT_NAMES,
  ALIGNMENTS,
  type Alignment,
  type AreaPreview,
  type AreaRequest,
  abilityModifier,
  areaSquares,
  BuildError,
  builder,
  type Catalog,
  type CharacterBuild,
  type CharacterState,
  type ChoiceKind,
  type ClassLevel,
  type CombatantOptions,
  type CreationRules,
  checkAction,
  combatantOptions,
  computePlaySheet,
  createBuild,
  createEncounter,
  createState,
  currentCombatant,
  DAMAGE_TYPES,
  type DamagePart,
  type DamageType,
  type Encounter,
  type EncounterAction,
  EncounterActionSchema,
  EncounterError,
  encounterCombatant,
  applyAction as engineApplyAction,
  applyEncounterAction as engineApplyEncounterAction,
  previewArea as enginePreviewArea,
  previewMove as enginePreviewMove,
  evaluate,
  gridDistance,
  type Issue,
  issuesForLevel,
  issuesForStep,
  lookup,
  MAX_ATTUNED,
  type MovePreview,
  type OptionView,
  type PackManifest,
  type Pending,
  type PlayAction,
  PlayError,
  type PlaySheet,
  type PointBuyRules,
  type PointBuyStatus,
  parseBuild,
  parseEncounter,
  parseState,
  pointBuyStatus,
  type Reachable,
  type Rng,
  type RolledDamage,
  type RollResult,
  reachableSquares,
  reconcileState,
  roll,
  rollAbilityScores,
  rollDamage,
  SKILL_ABILITY,
  SKILLS,
  type Skill,
  STEP_TITLES,
  STEPS,
  type Step,
  seededRng,
  skillName,
  type TableName,
  type ValidationReport,
  validateState,
} from "srd-rules-engine";
import { z } from "zod";
import { ContentLoader, type ContentSettings, type FetchPackFile } from "./content";

// --- results ------------------------------------------------------------------------------

/** A refused setter or action: the document is unchanged; `reasons` are the engine's words. */
export interface Refusal {
  readonly ok: false;
  readonly reasons: readonly string[];
}
export type Outcome<T> = ({ readonly ok: true } & T) | Refusal;

export type LevelUpOption = builder.LevelUpOption;
export type StateIssue = ReturnType<typeof validateState>[number];

// --- builder views --------------------------------------------------------------------------

/** One active choice, with every option and the reason it can't be picked. */
export interface ChoiceView {
  readonly key: string;
  readonly label: string;
  readonly kind: ChoiceKind;
  /** The character level the choice is made at (1: character creation). */
  readonly level: number;
  readonly step: Step;
  readonly step_title: string;
  /** How many picks (a replacement is answered `[old, new]`). */
  readonly count: number;
  readonly required: number;
  readonly replaces: { readonly family: string; readonly label: string } | null;
  /** For a replacement: the picks that can be replaced (`options` are the new ones). */
  readonly replace_old_options: readonly OptionView[] | null;
  readonly hint: string | null;
  readonly source: string;
  readonly fixed: readonly string[] | null;
  readonly selected: readonly string[];
  readonly options: readonly OptionView[];
  /** The same option can be picked more than once (Ability Score Improvement). */
  readonly repeats: boolean;
  /** Picks can be changed after a Short or Long Rest (in the play state: `set_choice`). */
  readonly rest_change: "short" | "long" | null;
}

export interface StepView {
  readonly step: Step;
  readonly title: string;
  readonly complete: boolean;
  readonly issues: readonly Issue[];
}

export interface LevelView {
  readonly level: number;
  readonly class_id: string;
  readonly class_level: number;
  readonly hp: number | null;
  readonly complete: boolean;
  readonly issues: readonly Issue[];
}

export interface AbilitiesView {
  readonly method: AbilityMethod | null;
  readonly standard_array: readonly number[];
  readonly rolled_pool: readonly number[];
  readonly point_buy_rules: PointBuyRules;
  /** Budget and per-ability costs (point buy only). */
  readonly point_buy: PointBuyStatus | null;
  /** The abilities the background can raise. */
  readonly background_abilities: readonly string[];
  readonly max_score_at_creation: number;
}

/** Everything the builder shows for a build: `evaluate` shaped as JSON. */
export interface BuildView {
  readonly build: CharacterBuild;
  readonly report: ValidationReport;
  readonly sheet: ReturnType<typeof evaluate>["sheet"];
  readonly level: number;
  readonly levels: readonly LevelView[];
  readonly level_up_options: readonly LevelUpOption[];
  readonly choices: readonly ChoiceView[];
  readonly steps: readonly StepView[];
  /** The first step with something missing or illegal, if any. */
  readonly next_step: Step | null;
  readonly abilities: AbilitiesView;
}

/** A change to a build, as the builder's setters take it. */
export type BuildEdit =
  | { readonly type: "class"; readonly id: string }
  | { readonly type: "species"; readonly id: string }
  | { readonly type: "background"; readonly id: string }
  | {
      readonly type: "ability_method";
      readonly method: AbilityMethod;
      readonly pool?: readonly number[];
    }
  | { readonly type: "base_scores"; readonly scores: AbilityMap }
  | { readonly type: "background_bonus"; readonly bonus: AbilityMap }
  | { readonly type: "choice"; readonly key: string; readonly values: readonly string[] }
  | { readonly type: "name"; readonly name: string }
  | { readonly type: "alignment"; readonly alignment: Alignment }
  /** `hp`: the Hit Die roll, or `null` for the fixed value. */
  | { readonly type: "level_up"; readonly class_id: string; readonly hp: number | null }
  | { readonly type: "remove_level" }
  | { readonly type: "level_class"; readonly level: number; readonly class_id: string }
  | { readonly type: "level_hp"; readonly level: number; readonly hp: number | null };

export interface BuildChange {
  readonly build: CharacterBuild;
  readonly notes: readonly string[];
}

export interface ChangePreview extends BuildChange {
  readonly removed: readonly {
    readonly level: number;
    readonly key: string;
    readonly label: string;
    readonly values: readonly string[];
  }[];
  readonly pending: readonly { readonly level: number; readonly message: string }[];
}

// --- play and encounters ------------------------------------------------------------------

export interface PlayView {
  readonly sheet: PlaySheet;
  readonly issues: readonly StateIssue[];
}

export interface PlayChange {
  readonly state: CharacterState;
  readonly notes: readonly string[];
}

/** A character an encounter refers to, by its key. */
export interface CharacterDocs {
  readonly build: CharacterBuild;
  readonly state: CharacterState;
}
export type Party = Readonly<Record<string, CharacterDocs>>;

/** The rolls of an encounter action (`attack`, `cast`, `check`…), for showing the dice. */
export type ActionResult = ReturnType<typeof engineApplyEncounterAction>["result"];

export interface EncounterChange {
  readonly encounter: Encounter;
  /** Character states the actions changed, by character key. */
  readonly states: Readonly<Record<string, CharacterState>>;
  readonly notes: readonly string[];
  /** The decision the list stopped at (also `encounter.pending`). */
  readonly pending: Pending | null;
  /** Actions applied before the one that stopped for a decision. */
  readonly applied: number;
  /** Each applied action's rolls, in order (and the stopped one's, last, if any). */
  readonly results: readonly NonNullable<ActionResult>[];
}

/** A combatant as the Initiative order and the map show it. */
export interface CombatantView {
  readonly id: string;
  readonly name: string;
  readonly side: string;
  readonly monster: string | null;
  readonly character: string | null;
  readonly initiative: number | null;
  readonly hp: number;
  readonly max_hp: number;
  readonly temp_hp: number;
  readonly armor_class: number;
  readonly conditions: readonly { readonly id: string; readonly name: string }[];
  readonly concentration: string | null;
  readonly defeated: boolean;
  readonly dying: boolean;
  readonly dead: boolean;
  readonly size: string | null;
  /**
   * Squares on a side of its space. The engine doesn't expose a combatant's space yet
   * (docs/ENGINE-GAPS.md): until it does, every creature counts as one square here.
   */
  readonly space: number;
  readonly position: { readonly x: number; readonly y: number } | null;
  readonly used: Encounter["combatants"][number]["used"];
  readonly inspiration: Encounter["combatants"][number]["inspiration"];
  readonly decisions: "ask" | "auto" | null;
  /** The engine couldn't build this combatant (a character that isn't loaded). */
  readonly error: string | null;
}

/** A zone (a lasting spell area) as the map draws it. */
export interface ZoneView {
  readonly id: string;
  readonly label: string;
  readonly by: string;
  /** Squares it covers (`"x,y"`), from the engine's `areaSquares`. */
  readonly squares: readonly string[];
  /** A wall between squares (Wall of Force): grid-line segments. */
  readonly segments: readonly { readonly from: GridXY; readonly to: GridXY }[];
  readonly difficult: boolean;
}

type GridXY = { readonly x: number; readonly y: number };

export interface EncounterView {
  readonly round: number;
  /** Whose turn it is (`null` before the fight starts). */
  readonly current: string | null;
  /** Combatants in Initiative order, then those without a place in it. */
  readonly combatants: readonly CombatantView[];
  readonly zones: readonly ZoneView[];
}

export interface AreaPlacementInput {
  readonly point?: { readonly x: number; readonly y: number };
  readonly toward?: { readonly x: number; readonly y: number };
}

/**
 * The engine's fixed lists and names the UI iterates or shows (abilities, skills, damage types,
 * alignments, builder steps), fetched once at startup so the main thread imports no engine code.
 */
export interface EngineConstants {
  readonly abilities: readonly { readonly id: Ability; readonly name: string }[];
  readonly skills: readonly {
    readonly id: Skill;
    readonly name: string;
    readonly ability: Ability;
  }[];
  readonly damage_types: readonly DamageType[];
  readonly alignments: readonly { readonly id: Alignment; readonly name: string }[];
  readonly steps: readonly { readonly id: Step; readonly title: string }[];
  readonly max_attuned: number;
  /** The skills each check action accepts (Search, Study, Influence), from its schema. */
  readonly check_skills: Readonly<Record<string, readonly Skill[]>>;
}

// --- the facade ---------------------------------------------------------------------------

export interface EngineFacade {
  constants(): Promise<EngineConstants>;
  /** Packs and allowed sources; the catalog is rebuilt on the next operation. */
  configure(settings: ContentSettings): Promise<void>;
  /** Fix the dice (a dev setting, to replay a bug), or `null` for a random seed. */
  setSeed(seed: number | null): Promise<void>;

  // content
  entries(table: TableName): Promise<readonly unknown[]>;
  entry(table: TableName, id: string): Promise<unknown>;
  packs(): Promise<readonly PackManifest[]>;
  creation(): Promise<CreationRules>;
  /** Ability modifiers for scores (`abilityModifier`): a stat block shows them. */
  modifiers(scores: Readonly<Record<string, number>>): Promise<Record<string, number>>;

  // documents: validate and migrate whatever was loaded
  parseBuild(input: unknown): Promise<Outcome<{ build: CharacterBuild }>>;
  parseState(input: unknown): Promise<Outcome<{ state: CharacterState }>>;
  parseEncounter(input: unknown): Promise<Outcome<{ encounter: Encounter }>>;
  newBuild(): Promise<CharacterBuild>;
  newEncounter(options?: { decisions?: "ask" | "auto" }): Promise<Encounter>;

  // builder
  evaluate(build: CharacterBuild): Promise<BuildView>;
  editBuild(build: CharacterBuild, edit: BuildEdit): Promise<Outcome<BuildChange>>;
  /** What an edit would remove and ask again, without applying it. */
  previewEdit(build: CharacterBuild, edit: BuildEdit): Promise<Outcome<ChangePreview>>;
  rollAbilityScores(): Promise<readonly AbilityRoll[]>;

  // play
  createState(build: CharacterBuild): Promise<CharacterState>;
  playSheet(build: CharacterBuild, state: CharacterState): Promise<PlayView>;
  /** One action or a list, in order; all or nothing. */
  applyPlayAction(
    build: CharacterBuild,
    state: CharacterState,
    action: PlayAction | readonly PlayAction[],
  ): Promise<Outcome<PlayChange>>;
  reconcileState(build: CharacterBuild, state: CharacterState): Promise<PlayChange>;

  // encounters
  /** One action or a list, in order; all or nothing, stopping at a decision. */
  applyEncounterAction(
    encounter: Encounter,
    party: Party,
    action: EncounterAction | readonly EncounterAction[],
  ): Promise<Outcome<EncounterChange>>;
  encounterView(encounter: Encounter, party: Party): Promise<EncounterView>;
  combatantOptions(encounter: Encounter, party: Party, id: string): Promise<CombatantOptions>;
  checkAction(encounter: Encounter, party: Party, action: EncounterAction): Promise<ActionCheck>;
  /** What an area would cover if placed now: its squares and creatures (`previewArea`). */
  previewArea(encounter: Encounter, party: Party, request: AreaRequest): Promise<AreaPreview>;
  /** Squares a combatant can end a move on now, with their cost (`reachableSquares`). */
  reachable(encounter: Encounter, party: Party, id: string): Promise<Reachable>;
  /** What a move would do: its path, cost, zones and Opportunity Attacks (`previewMove`). */
  previewMove(
    encounter: Encounter,
    party: Party,
    move: { id: string; to: { x: number; y: number } },
  ): Promise<MovePreview>;
  /** Feet between two squares on the grid (`gridDistance`), for measuring. */
  distance(from: { x: number; y: number }, to: { x: number; y: number }): Promise<number>;
  /** Squares within `feet` of a combatant's space (`gridDistance`), to show reach and range. */
  squaresWithin(encounter: Encounter, id: string, feet: number): Promise<readonly string[]>;

  // dice
  /** A free roll (`2d6+3`), with the worker's dice. */
  roll(expression: string): Promise<Outcome<{ roll: RollResult }>>;
  /** Roll an attack line's damage parts (`rollDamage`): a Critical Hit doubles the dice. */
  rollDamage(parts: readonly DamagePart[], critical: boolean): Promise<RolledDamage>;
}

// --- in-process implementation --------------------------------------------------------------

export interface FacadeOptions {
  readonly fetchFile: FetchPackFile;
  /** A fixed seed; default a random one (`crypto.getRandomValues`). */
  readonly seed?: number | null;
  /** Dice for tests (`scriptedRng`); overrides `seed`. */
  readonly rng?: Rng;
}

export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
}

export function createInProcessFacade(options: FacadeOptions): EngineFacade {
  const content = new ContentLoader(options.fetchFile);
  let rng: Rng = options.rng ?? seededRng(options.seed ?? randomSeed());

  return {
    constants: async () => ({
      abilities: ABILITIES.map((id) => ({ id, name: ABILITY_NAMES[id] })),
      skills: SKILLS.map((id) => ({ id, name: skillName(id), ability: SKILL_ABILITY[id] })),
      damage_types: DAMAGE_TYPES,
      alignments: ALIGNMENTS.map((id) => ({ id, name: ALIGNMENT_NAMES[id] })),
      steps: STEPS.map((id) => ({ id, title: STEP_TITLES[id] })),
      max_attuned: MAX_ATTUNED,
      check_skills: checkSkills(),
    }),
    async configure(settings) {
      content.configure(settings);
    },
    async setSeed(seed) {
      rng = seededRng(seed ?? randomSeed());
    },

    entries: async (table) => {
      const catalog = await content.catalog([table]);
      return Object.values(catalog[table] as Record<string, unknown>);
    },
    entry: async (table, id) => {
      const catalog = await content.catalog([table]);
      return lookup(catalog[table] as Record<string, unknown>, id) ?? null;
    },
    packs: () => content.run("builder", (catalog) => catalog.packs),
    creation: () => content.run("builder", (catalog) => catalog.creation),
    modifiers: async (scores) =>
      Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, abilityModifier(v)])),

    parseBuild: async (input) => attempt(() => ({ build: parseBuild(input) })),
    parseState: async (input) => attempt(() => ({ state: parseState(input) })),
    parseEncounter: async (input) => attempt(() => ({ encounter: parseEncounter(input) })),
    newBuild: async () => createBuild(),
    newEncounter: async (opts) => createEncounter(opts),

    evaluate: (build) => content.run("builder", (catalog) => buildView(build, catalog)),
    editBuild: (build, edit) =>
      content.run("builder", (catalog) => attempt(() => applyEdit(build, catalog, edit))),
    previewEdit: (build, edit) =>
      content.run("builder", (catalog) =>
        attempt(() =>
          builder.previewChange(
            build,
            catalog,
            (b) => applyEdit(b, catalog, edit),
            edit.type === "choice" ? edit.key : undefined,
          ),
        ),
      ),
    rollAbilityScores: async () => rollAbilityScores(rng),

    createState: (build) => content.run("play", (catalog) => createState(build, catalog)),
    playSheet: (build, state) =>
      content.run("play", (catalog) => ({
        sheet: computePlaySheet(build, state, catalog),
        issues: validateState(build, state, catalog),
      })),
    applyPlayAction: (build, state, action) =>
      content.run("play", (catalog) =>
        attempt(() => {
          let current = state;
          const notes: string[] = [];
          for (const a of listOf(action)) {
            const result = engineApplyAction(build, current, catalog, a, { rng });
            current = result.state;
            notes.push(...result.notes);
          }
          return { state: current, notes };
        }),
      ),
    reconcileState: (build, state) =>
      content.run("play", (catalog) => reconcileState(build, state, catalog)),

    applyEncounterAction: (encounter, party, action) =>
      content.run("encounter", (catalog) =>
        attempt(() => {
          const characters: Record<string, CharacterDocs> = { ...party };
          let current = encounter;
          const states: Record<string, CharacterState> = {};
          const notes: string[] = [];
          const results: NonNullable<ActionResult>[] = [];
          let applied = 0;
          for (const a of listOf(action)) {
            const result = engineApplyEncounterAction(current, a, { catalog, characters, rng });
            current = result.encounter;
            notes.push(...result.notes);
            if (result.result) results.push(result.result);
            if (result.pending) {
              return {
                encounter: current,
                states,
                notes,
                pending: result.pending,
                applied,
                results,
              };
            }
            applied += 1;
            for (const [key, state] of Object.entries(result.states)) {
              const docs = characters[key];
              if (!docs) continue;
              states[key] = state;
              characters[key] = { build: docs.build, state };
            }
          }
          return { encounter: current, states, notes, pending: null, applied, results };
        }),
      ),
    encounterView: (encounter, party) =>
      content.run("encounter", (catalog) => encounterView(encounter, party, catalog)),
    combatantOptions: (encounter, party, id) =>
      content.run("encounter", (catalog) =>
        combatantOptions(encounter, id, { catalog, characters: party }),
      ),
    checkAction: (encounter, party, action) =>
      content.run("encounter", (catalog) =>
        checkAction(encounter, action, { catalog, characters: party }),
      ),

    previewArea: (encounter, party, request) =>
      content.run("encounter", (catalog) =>
        enginePreviewArea(encounter, request, { catalog, characters: party }),
      ),
    reachable: (encounter, party, id) =>
      content.run("encounter", (catalog) =>
        reachableSquares(encounter, id, { catalog, characters: party }),
      ),
    previewMove: (encounter, party, move) =>
      content.run("encounter", (catalog) =>
        enginePreviewMove(encounter, move, { catalog, characters: party }),
      ),
    distance: async (from, to) => gridDistance(from, 1, to, 1),
    squaresWithin: async (encounter, id, feet) => {
      const c = encounter.combatants.find((x) => x.id === id);
      if (!c?.position) return [];
      const r = Math.ceil(feet / 5);
      const out: string[] = [];
      for (let x = c.position.x - r; x <= c.position.x + UNKNOWN_SPACE - 1 + r; x++) {
        for (let y = c.position.y - r; y <= c.position.y + UNKNOWN_SPACE - 1 + r; y++) {
          const d = gridDistance(c.position, UNKNOWN_SPACE, { x, y }, 1);
          if (d > 0 && d <= feet) out.push(`${x},${y}`);
        }
      }
      return out;
    },
    roll: async (expression) => attempt(() => ({ roll: roll(expression, rng) })),
    rollDamage: async (parts, critical) => rollDamage(parts, { critical, rng }),
  };
}

/** The `skill` enum of each encounter action that takes one, read from the engine's schema. */
function checkSkills(): Record<string, Skill[]> {
  const out: Record<string, Skill[]> = {};
  for (const option of EncounterActionSchema.options) {
    const shape = option.shape as Record<string, unknown>;
    const type = (shape.type as { value?: string } | undefined)?.value;
    let skill = shape.skill as { options?: unknown; unwrap?: () => unknown } | undefined;
    if (!type || !skill || type === "check" || type === "help") continue;
    if (!Array.isArray(skill.options) && skill.unwrap) skill = skill.unwrap() as typeof skill;
    if (Array.isArray(skill?.options)) out[type] = skill.options as Skill[];
  }
  return out;
}

/**
 * A combatant's space in squares: not exposed by the engine yet (docs/ENGINE-GAPS.md, "Creature
 * space"), so the map counts every creature as one square until it is.
 */
const UNKNOWN_SPACE = 1;

function zoneSquares(encounter: Encounter, zone: Encounter["zones"][number]): string[] {
  // A wall spell's zone lists its squares (and the wall's own).
  if (zone.squares) return [...zone.squares, ...zone.wall_squares].map((p) => `${p.x},${p.y}`);
  try {
    if (zone.area.shape === "emanation") {
      if (zone.point)
        return [...areaSquares(zone.area, { position: zone.point, size: zone.space }, {})];
      const caster = encounter.combatants.find((c) => c.id === zone.by);
      if (!caster?.position) return [];
      return [...areaSquares(zone.area, { position: caster.position, size: UNKNOWN_SPACE }, {})];
    }
    if (!zone.point) return [];
    return [...areaSquares(zone.area, { position: zone.point, size: 1 }, { point: zone.point })];
  } catch {
    return [];
  }
}

function listOf<T>(value: T | readonly T[]): readonly T[] {
  return Array.isArray(value) ? (value as readonly T[]) : [value as T];
}

/** Run an engine call, turning its refusals into a `Refusal` (classes don't survive postMessage). */
function attempt<T extends object>(fn: () => T): Outcome<T> {
  try {
    return { ok: true, ...fn() };
  } catch (error) {
    const reasons = refusalReasons(error);
    if (reasons) return { ok: false, reasons };
    throw error;
  }
}

function refusalReasons(error: unknown): readonly string[] | null {
  if (error instanceof BuildError) return error.messages;
  if (error instanceof PlayError || error instanceof EncounterError) return error.messages;
  if (error instanceof z.ZodError) return z.prettifyError(error).split("\n").filter(Boolean);
  // Bad dice expressions and unknown attack lines.
  if (error instanceof RangeError) return [error.message];
  return null;
}

function applyEdit(build: CharacterBuild, catalog: Catalog, edit: BuildEdit): BuildChange {
  switch (edit.type) {
    case "class":
      return builder.setClass(build, catalog, edit.id);
    case "species":
      return builder.setSpecies(build, catalog, edit.id);
    case "background":
      return builder.setBackground(build, catalog, edit.id);
    case "ability_method":
      return builder.setAbilityMethod(build, catalog, edit.method, edit.pool ?? []);
    case "base_scores":
      return builder.setBaseScores(build, catalog, edit.scores);
    case "background_bonus":
      return builder.setBackgroundBonus(build, catalog, edit.bonus);
    case "choice":
      return builder.setChoice(build, catalog, edit.key, edit.values);
    case "name":
      return builder.setName(build, catalog, edit.name);
    case "alignment":
      return builder.setAlignment(build, catalog, edit.alignment);
    case "level_up":
      return builder.levelUp(build, catalog, edit.class_id, edit.hp);
    case "remove_level":
      return builder.removeLastLevel(build, catalog);
    case "level_class":
      return builder.setLevelClass(build, catalog, edit.level, edit.class_id);
    case "level_hp":
      return builder.setLevelHp(build, catalog, edit.level, edit.hp);
  }
}

function buildView(build: CharacterBuild, catalog: Catalog): BuildView {
  const ev = evaluate(build, catalog);
  const res = ev.resolution;
  const choices: ChoiceView[] = res.choices.map((c) => ({
    key: c.key,
    label: c.label,
    kind: c.definition.kind,
    level: c.level,
    step: c.step,
    step_title: STEP_TITLES[c.step],
    count: c.replaces ? 2 : res.countOf(c),
    required: res.required(c),
    replaces: c.replaces ? { family: c.replaces.id, label: c.replaces.label } : null,
    replace_old_options: c.replaces ? res.replaceOld(c) : null,
    hint: c.definition.hint,
    source: c.source.name,
    fixed: c.fixed,
    selected: res.selected(c),
    options: res.options(c),
    repeats: c.definition.kind === "ability_increase",
    rest_change: c.definition.rest_change,
  }));
  const levels: LevelView[] = res.levels.map((l: ClassLevel) => {
    const issues = issuesForLevel(ev.report, l.level);
    return {
      ...l,
      issues,
      complete: issues.every((i) => i.severity === "note"),
    };
  });
  const steps: StepView[] = STEPS.map((step) => {
    const issues = issuesForStep(ev.report, step);
    return {
      step,
      title: STEP_TITLES[step],
      issues,
      complete: issues.every((i) => i.severity === "note"),
    };
  });
  const rules = catalog.creation.point_buy;
  const background = lookup(catalog.backgrounds, build.background_id);
  return {
    build,
    report: ev.report,
    sheet: ev.sheet,
    level: res.characterLevel,
    levels,
    level_up_options: builder.levelUpOptions(build, catalog),
    choices,
    steps,
    next_step: builder.nextIncompleteStep(ev),
    abilities: {
      method: build.ability_method,
      standard_array: catalog.creation.standard_array,
      rolled_pool: build.rolled_pool,
      point_buy_rules: rules,
      point_buy:
        build.ability_method === "point_buy" ? pointBuyStatus(build.base_scores, rules) : null,
      background_abilities: background?.ability_scores ?? [],
      max_score_at_creation: catalog.creation.max_score_at_creation,
    },
  };
}

function encounterView(encounter: Encounter, party: Party, catalog: Catalog): EncounterView {
  const ctx = { catalog, characters: party };
  const conditionName = (id: string) => lookup(catalog.conditions, id)?.name ?? id;
  const ordered = [
    ...encounter.order,
    ...encounter.combatants.map((c) => c.id).filter((id) => !encounter.order.includes(id)),
  ];
  const combatants = ordered.flatMap((id): CombatantView[] => {
    const c = encounter.combatants.find((x) => x.id === id);
    if (!c) return [];
    const base = {
      id: c.id,
      name: c.name,
      side: c.side,
      monster: c.monster,
      character: c.character,
      initiative: c.initiative,
      defeated: c.defeated,
      position: c.position,
      used: c.used,
      inspiration: c.inspiration,
      decisions: c.decisions,
    };
    try {
      const view = encounterCombatant(encounter, c.id, ctx);
      const docs = c.character !== null ? party[c.character] : undefined;
      const play = docs ? computePlaySheet(docs.build, docs.state, catalog).play : null;
      return [
        {
          ...base,
          hp: view.hp,
          max_hp: view.max_hp,
          temp_hp: view.temp_hp,
          armor_class: view.armor_class,
          conditions: view.conditions.map((id) => ({ id, name: conditionName(id) })),
          concentration: play ? play.concentration : c.concentration,
          dying: play?.dying ?? false,
          dead: play?.dead ?? false,
          size: view.size,
          space: UNKNOWN_SPACE,
          error: null,
        },
      ];
    } catch (error) {
      return [
        {
          ...base,
          hp: c.hp ?? 0,
          max_hp: 0,
          temp_hp: c.temp_hp,
          armor_class: 0,
          conditions: c.conditions.map((id) => ({ id, name: conditionName(id) })),
          concentration: c.concentration,
          dying: false,
          dead: false,
          size: null,
          space: UNKNOWN_SPACE,
          error: error instanceof Error ? error.message : String(error),
        },
      ];
    }
  });
  const zones: ZoneView[] = encounter.zones.map((z) => ({
    id: z.id,
    label: z.label,
    by: z.by,
    squares: zoneSquares(encounter, z),
    segments: z.segments,
    difficult: z.difficult,
  }));
  return {
    round: encounter.round,
    current: currentCombatant(encounter)?.id ?? null,
    combatants,
    zones,
  };
}
