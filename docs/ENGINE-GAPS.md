# Engine gaps

What the UI needs from [`srd-rules-engine`](../../srd-rules-engine) and doesn't get yet. The UI
never works around a gap with rules of its own: each entry says what's missing, what the app does
meanwhile, and what would close it. Raise them in the engine repo; remove an entry when the engine
provides it (and remove the fallback named here).

Most important first.

## 1. Creature space on the grid

**Missing.** How many squares a combatant's space is (Large 2×2, Huge 3×3…). The engine knows
(`spaceOf` in `services/encounter.ts`) but doesn't export it, and `encounterCombatant` gives only
`size`.

**Meanwhile.** `UNKNOWN_SPACE = 1` in `src/engine/facade.ts`: tokens are drawn one square wide
(with the size's letter), and the range highlight and Emanation zones measure from a one-square
space. The engine's own previews (moves, areas) and every action use the real space.

**Wanted.** `space` (squares per side) on a combatant view, or `spaceOf` exported.

## 2. Emanation zones' squares

**Missing.** The squares of an Emanation zone around a creature (its origin is the creature's
space: gap 1). Wall zones list their own `squares` and `segments`; the engine's `previewArea`
gives an aimed area's exact squares and creatures; moves use `reachableSquares` and
`previewMove` (all closed since P25 and P30).

**Meanwhile.** `zoneSquares` in the facade calls `areaSquares` with a one-square origin for an
Emanation around its caster.

**Wanted.** `zone.squares` for every zone (or a `zoneSquares(encounter, zone, ctx)`).

## 3. Which attack options a combatant has

**Missing.** Whether a combatant can use Cunning Strike or Brutal Strike on an attack (`attack`
`cunning` / `brutal`), and with which effects: `combatantOptions` doesn't list them.

**Meanwhile.** The composer doesn't offer them; the engine applies neither unless asked.

**Wanted.** On an attack option, the `cunning` / `brutal` effects it can add (and their cost).

## 4. Options for choices changed after a rest

**Missing.** A rest-change choice's options judged against the build as played today
(`playBuild` isn't exported, and `evaluate` judges the saved build).

**Meanwhile.** The sheet's "Today's picks" list the options of the saved build's `evaluate`; the
engine's `set_choice` play action still validates against the played build and refuses with its
reasons.

**Wanted.** `evaluate` options for the played build (an `evaluatePlay(build, state, catalog)`), or
`playBuild` exported.

## 5. Bases a magic item can be made from

**Missing.** The catalog items a magic item can be made from (`magic_items[].base` describes it
as a rule: kind, categories, exceptions).

**Meanwhile.** "Add an item" offers every item of the base's kind (weapons, armor, or gear for
ammunition); `add_item` refuses an invalid base with the engine's reason.

**Wanted.** `magicItemBases(catalog, itemId)` → item ids.

## 6. Translatable engine messages

**Missing.** Engine strings (notes, option labels, issue messages, builder and play refusals,
decision questions) are English sentences. The UI shows them verbatim and never parses them, so
it can't translate them. Encounter refusals now carry codes (`EncounterError.codes`,
`REFUSAL_CODES`, since P26), which a translation could key on; the rest don't.

**Meanwhile.** The app's own words are in `src/i18n/` (English), ready for an Italian catalog;
engine text stays English.

**Wanted.** A message code and parameters next to each string (`{ code: "already_proficient",
params: { source: "Soldier" }, text: "…" }`), or a `locale` option with translated catalogs in
the engine. SRD content itself can be translated as a layered content pack.

## 7. Rolls for a character outside an encounter

**Missing.** Ability checks, saving throws and attack rolls for a character from its play state,
with the Advantage or Disadvantage its conditions and features give (the encounter's `check`
does this for a combatant; there's no equivalent on a sheet).

**Meanwhile.** The sheet's roll buttons are plain free rolls of the engine's dice (`1d20+bonus`;
damage through `rollDamage`), labelled as such. Inside an encounter, use the `check` action and
attacks.

**Wanted.** `rollCheck(build, state, catalog, { skill | ability | save }, { rng })` and an attack
roll on a character's attack line without a target.

## 8. Number previews on options

**Missing.** What picking an option would change on the sheet ("Defense · AC 16→17"), as the CLI
builder shows.

**Meanwhile.** Not shown; the live summary updates after a pick.

**Wanted.** A sheet diff per option (`previewOption(build, catalog, key, value)` → changed stats).

## 9. Standard-array helpers

**Missing.** `unassignedValues` (the values of the array or the rolls not yet assigned) isn't
exported.

**Meanwhile.** Each ability offers every value of the pool; assigning a value already in use swaps
the two abilities (a convenience, not a rule); the engine validates every assignment.

**Wanted.** `unassignedValues` exported.

## 10. Combatants in results

**Missing.** Results name their targets (`SpellTargetResult.name`, an index into the targets
given), not their combatant ids.

**Meanwhile.** The dice tray shows names.

**Wanted.** The combatant id on each target result of an encounter action.

## 11. Bloodied

**Missing.** Whether a combatant or character is Bloodied (at half its Hit Points or fewer, a
rules term in SRD 5.2.1), on the combatant view and the play sheet.

**Meanwhile.** HP bars are drawn in one colour (graphite); the UI doesn't work out the half
itself.

**Wanted.** `bloodied: boolean` on `encounterCombatant`'s view and on `computePlaySheet`'s HP; the
bar then turns red (`HpBar` in `src/components/ui.tsx`).
