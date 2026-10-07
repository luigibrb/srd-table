# Engine gaps

What the app is waiting for from [`srd-rules-engine`](../../srd-rules-engine), kept for this
repo's own work: what the app does meanwhile, where that fallback lives, and what to change once
the engine delivers.

**How engine work happens.** This repo's sessions never change engine code. A need is written
as a requirement in the engine's `docs/REQUESTS.md` (git-ignored there, read by the engine's own
Claude Code session), with an id `R<n>`; it's tracked here under the same id. When a request is
`done`: rebuild the engine's `dist/` (`npx tsdown --config-loader tsx` in the engine),
`npm run content`, wire the app, delete the fallback named here, move the entry to "Done" below.

**How a delivery is noticed.** The engine session appends an entry to its `docs/RESPONSES.md`
(commit, CHANGELOG entry, final API names, differences), puts `Request: R<n>` in the commit's
trailer, and may send this session a `SendMessage` nudge. Check at the start of a session and
before engine-dependent work: `docs/RESPONSES.md` and `git -C ../srd-rules-engine log --grep
"^Request:"`. A `needs info` entry is answered under the request in `REQUESTS.md`.

The app never works around a gap with rules of its own.

## Waiting

| Id | What the app is missing | Engine status |
|---|---|---|
| R3 | Bloodied | open |
| R4 | Creature space | open |
| R5 | Emanation zones' squares | open |
| R6 | Cunning / Brutal Strike on attack options | open |
| R7 | Rest-change options as played | open |
| R8 | Magic item bases | open |
| R9 | Rolls for a character outside an encounter | open |
| R10 | Combatant ids in results | open |
| R11 | Option previews in the builder | open |
| R12 | `unassignedValues` | open |
| R13 | Translatable engine messages | open (large) |
| R14 | Positions required when the map is in use (proposal) | open, low priority |

### R3. Bloodied

- **Meanwhile.** HP bars are always graphite (`HpBar`, `src/components/ui.tsx`).
- **When done.** Red bar when `bloodied`; the rail (`InitiativeRail.tsx`) and the sheet's
  `HitPoints.tsx` pass it to `HpBar`.

### R4. Creature space

- **Meanwhile.** `UNKNOWN_SPACE = 1` in `src/engine/facade.ts`: tokens one square wide with the
  size's letter (`BattleMap.tsx` `Token`), reach highlight and Emanations from one square.
- **When done.** Use the engine's `space` in the facade's combatant view; delete `UNKNOWN_SPACE`
  and the size letter.

### R5. Emanation zones' squares

- **Meanwhile.** `zoneSquares` in `src/engine/facade.ts` calls `areaSquares` with a one-square
  origin for an Emanation around its caster.
- **When done.** Draw `zone.squares` (or the engine's function) for every zone; delete that
  branch of `zoneSquares`.

### R6. Cunning / Brutal Strike

- **Meanwhile.** The composer (`ActionComposer.tsx`) doesn't offer them.
- **When done.** Checkboxes in the composer from the option's list, sent as `attack.cunning` /
  `attack.brutal`.

### R7. Rest-change options as played

- **Meanwhile.** The sheet's "Today's picks" use the saved build's `evaluate`; `set_choice`
  refuses with the engine's reasons when they differ.
- **When done.** A facade method over `evaluatePlay` (or `playBuild` + `evaluate`) for those
  lists.

### R8. Magic item bases

- **Meanwhile.** "Add an item" (`InventoryTab.tsx`) offers every item of the base's kind;
  `add_item` refuses invalid ones.
- **When done.** Offer only `magicItemBases`.

### R9. Rolls outside an encounter

- **Meanwhile.** Sheet roll buttons (`OverviewTab.tsx` `RollButton`, `CombatTab.tsx`) are
  labelled free rolls of `1d20+bonus`.
- **When done.** A facade `rollCheck`; the dice tray shows the mode and its reasons.

### R10. Combatant ids in results

- **Meanwhile.** The dice tray (`DiceTray.tsx`) shows target names.
- **When done.** Link results to tokens and the rail.

### R11. Option previews

- **Meanwhile.** The builder's live summary updates after a pick.
- **When done.** Show "AC 16 → 17" on each option (`ChoiceCard.tsx`).

### R12. `unassignedValues`

- **Meanwhile.** Each ability offers every value; assigning a taken value swaps the two
  (`AbilitiesStep.tsx`, a convenience, not a rule).
- **When done.** Offer only unassigned values.

### R13. Translatable engine messages

- **Meanwhile.** App words in `src/i18n/` (English, ready for Italian); engine text stays English.
- **When done.** Translate by code in the i18n catalogs; keep `text` as the fallback.

### R14. Positions required (proposal)

- **Meanwhile.** `OffMapNotice.tsx` warns that reach, range and areas aren't checked for a
  combatant off a map in use.
- **Decide first** whether the GM wants this; then a setting in `CombatPanel.tsx`.

## Done

| Id | What | Engine | App |
|---|---|---|---|
| R1 | Starting equipment taken after the state exists | `aef3cf1` (main) | sheet notice + `take_starting_equipment` (`InventoryTab.tsx` `StartingEquipment`) |
| R2 | Exploration and points of interest | `3b81071` (main) | `ExplorationPanel.tsx`, `PointPanel.tsx`, the map's Points tool and markers, the Move hint's turns |
