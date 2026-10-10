# Engine gaps

What the app is waiting for from [`srd-rules-engine`](../../srd-rules-engine), kept for this
repo's own work: what the app does meanwhile, where that fallback lives, and what to change once
the engine delivers.

**How engine work happens.** This repo's sessions never change engine code. A need is written
as a requirement in the engine's `docs/REQUESTS.md` (git-ignored there, read by the engine's own
Claude Code session), with an id `R<n>`; it's tracked here under the same id. When a request is
`done`: `npm run engine:update` (the engine's `main` into `../srd-rules-engine-main`, the
worktree the app builds against: `npm ci`, `dist/`, content), wire the app, delete the fallback named here, move the entry to "Done" below.

**How a delivery is noticed.** The engine session appends an entry to its `docs/RESPONSES.md`
(commit, CHANGELOG entry, final API names, differences), puts `Request: R<n>` in the commit's
trailer, and may send this session a `SendMessage` nudge. Check at the start of a session and
before engine-dependent work: `docs/RESPONSES.md` and `git -C ../srd-rules-engine log --grep
"^Request:"`. A `needs info` entry is answered under the request in `REQUESTS.md`.

The app never works around a gap with rules of its own.

## Waiting

| Id | What the app is missing | Engine status |
|---|---|---|
| R15 | Declared actions: costs only, outcome by hand (manual play) | open |
| R16 | Own dice: rolls that wait for entered numbers (manual play) | open |
| R17 | GM override of a refusal (manual play) | open |

### R13. Translatable engine messages (engine side done; the app's rendering to do)

- **Delivered (stages 1–5, the last `3c23939`).** Every engine string the app shows has a code
  (650 in `MESSAGES_EN`); content (names, choice labels, descriptions) and the sheet's number
  breakdowns are not messages, by design. Since stage 5: `Issue.detail`,
  `OptionView.unavailable_message`, `LevelUpOption.unavailable_message`, `BuildResult.messages`
  (facade `BuildChange.messages`), `ChangePreview.pending[].detail`, `StateIssue.detail`,
  `OptionEntry.label_message` / `note_message`, `StrikeOption.cost_message`; `StatChange.stat`
  to translate a preview's label by. Earlier stages: Encounter results carry `messages` (`{ code, params, text }`,
  one per note). The facade passes them on (`EncounterChange.messages`) and the combat log
  stores them with each entry (`LogEntry.messages`, kept on load only while they match the
  lines one for one), so entries saved now can be translated later. Since `d0496d9` every
  encounter sentence of the engine's own has a code (~130 more in `MESSAGES_EN`). Since `64f6e47`
  play results (`applyAction`, `reconcileState`), damage and `castSpell` carry `messages` too,
  and roll results carry `reason_messages` next to `reasons`. Since `1a0ee68` refusals carry
  `details` (`EncounterError`, `PlayError`, `BuildError`; `checkAction`, `previewMove`,
  `previewArea` `reason_messages`; `OptionEntry.reason_message`) and decisions
  `question_message`; the log stores a decision's `question_message` with its entry. Not coded
  yet (stage 5): the builder's validation errors and issues, the play sheet's state issues,
  builder and option labels. The app doesn't pass play `messages`, `reason_messages` or refusal
  `details` through yet: toasts, refusals and the dice results box aren't saved, so they need
  them only once a second language exists.
- **Meanwhile.** App words in `src/i18n/` in English and Italian (`it.ts`); everything the
  engine says (notes, reasons, labels, the log) shows `text`, in English.
- **Next: an Italian catalog of the engine's codes** (`MESSAGES_EN`'s codes with Italian
  templates, e.g. `src/i18n/engine/it.ts`, loaded in the worker). Render log entries from `messages` with the engine's
  `renderMessage(message, catalog)` (an engine value: call it in the worker through the facade,
  never on the main thread), falling back to `text`. Then pass play `messages` through the
  facade for the toasts, refusal `details` in `Refusal` (rendered where `Reasons` shows them),
  the options' `reason_message`, the dice results box's `reason_messages`, and wire the last
  stage (builder) as it lands.

### R15–R17. Manual play

- **Design.** `docs/ARCHITECTURE.md` > "Manual play" (decided 2026-10-10).
- **Meanwhile.** Nothing by hand beyond what exists: the GM's "effects by hand" (damage,
  healing, conditions) in the selection panel, and the sheet's slots, uses, HP and conditions.
- **When R15 is done.** "… by hand" next to each option's button (`QuickBar`, `ActionComposer`),
  sending the action with `manual: true`; the GM's view lists declared actions waiting for an
  outcome, with their targets, applied through `effects`; campaign defaults for characters and
  monsters (`store/settings.ts`) and a per-combatant mode in `SelectionPanel.tsx`.
- **When R16 is done.** "… I'll roll" next to each option; a roll-entry dialog for
  `pending.kind: "roll"` (like `DecisionDialog.tsx`), shown to the roll's controller; the
  per-combatant dice setting next to the decisions mode.
- **When R17 is done.** "Do it anyway" on a refused option, in the GM's view only, sending
  `force: true`; the override note in the log.

## Done

| Id | What | Engine | App |
|---|---|---|---|
| R1 | Starting equipment taken after the state exists | `aef3cf1` (main) | sheet notice + `take_starting_equipment` (`InventoryTab.tsx` `StartingEquipment`) |
| R2 | Exploration and points of interest | `3b81071` (main) | `ExplorationPanel.tsx`, `PointPanel.tsx`, the map's Points tool and markers, the Move hint's turns |
| R3 | Bloodied | `d07df13` (main) | `HpBar` `bloodied` (red), "Bloodied" label on the rail and the sheet |
| R4 | Creature space | `c8569e7` (main) | tokens drawn at their real size (`CombatantView.space` from the engine), reach and range from the whole space; the size letter is gone |
| R5 | Zone squares | `c8569e7` (main) | `zoneSquaresOf` in the facade calls the engine's `zoneSquares` (an Emanation leaves out its caster's space, as the engine's saves do) |
| R6 | Cunning / Brutal Strike | `b22a78e` (main) | "Strike effects" in the composer from `OptionEntry.strikes` (unavailable ones disabled with the engine's reason, not hidden), merged into the attack |
| R7 | Rest-change options as played | `7ec7459` (main) | facade `evaluatePlay` (`evaluate(playBuild(…))`) for the sheet's "Today's picks" (`RestChoices.tsx`) |
| R8 | Magic item bases | `bcc01bd` (main) | "Add an item" offers only `magicItemBases` (facade `magicItemBases`, `useMagicItemBases`) |
| R14 | Positions required (a GM setting) | `9c89a34` (main) | "Off the map" select in the GM's combat controls (`CombatPanel.tsx`: warn only / refuse what needs a distance, `set_positions`); the off-map notice says the engine refuses under `required` (`OffMapNotice.tsx`); refusals and disabled options come from the engine (`off_map`) |
| R13 | Message codes for translation | `5602229` … `3c23939` (main) | combat-log entries keep `messages` (notes and decision questions); rendering them in Italian is app work, below |
| R10 | Combatant ids in results | `0d8c00f` (main) | target names in the dice tray (spell, save effect and follow-up targets) are links: a click selects the combatant (rail and map) and pings its square (`DiceTray.tsx` `TargetName`, `useUi.focus`, `EncounterPage.tsx`) |
| R11 | Option previews | `2144460` (main) | each builder option shows what it would change ("AC 16 → 17", `ChoiceCard.tsx` `PreviewLine`, facade `optionPreviews`, `useOptionPreviews`), Ability Score Improvement rows too; not on the sheet's "Today's picks" (the saved build isn't the build as played) |
| R12 | `unassignedValues` | `5dbf55e` (main) | the ability selects offer only the engine's unassigned values plus the ability's own (`AbilitiesView.unassigned`); the swap convenience is gone |
| R9 | Rolls outside an encounter | `51d904d` (main) | sheet roll buttons (checks, saves, attack rolls) call `rollCheck` (facade, `rollTest` in `store/dice.ts`); the tray shows mode, reasons, outcome |
