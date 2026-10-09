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
| R13 | Translatable engine messages | partial: stage 3 of 4 (`5602229`, `d0496d9`, `64f6e47`: every play and encounter note, roll reasons) |
| R14 | Positions required when the map is in use (proposal) | open, low priority |

### R13. Translatable engine messages

- **Delivered so far (stages 1–3).** Encounter results carry `messages` (`{ code, params, text }`,
  one per note). The facade passes them on (`EncounterChange.messages`) and the combat log
  stores them with each entry (`LogEntry.messages`, kept on load only while they match the
  lines one for one), so entries saved now can be translated later. Since `d0496d9` every
  encounter sentence of the engine's own has a code (~130 more in `MESSAGES_EN`). Since `64f6e47`
  play results (`applyAction`, `reconcileState`), damage and `castSpell` carry `messages` too,
  and roll results carry `reason_messages` next to `reasons`. Still code `text`: decision
  questions and a `ModeReason` passed in as a plain string. Not coded yet: refusals
  (encounter, play, builder), the builder's labels and issues. The app doesn't pass play
  `messages` or `reason_messages` through yet: toasts and the dice results box aren't saved,
  so they need them only once a second language exists.
- **Meanwhile.** App words in `src/i18n/` (English, ready for Italian); the log shows `text`.
- **When an Italian catalog is added.** Render log entries from `messages` with the engine's
  `renderMessage(message, catalog)` (an engine value: call it in the worker through the facade,
  never on the main thread), falling back to `text`. Then pass play `messages` through the
  facade for the toasts, render the dice results box's reasons from `reason_messages`, and wire
  the last stage (decision questions, refusals, builder) as it lands.

### R14. Positions required (proposal)

- **Meanwhile.** `OffMapNotice.tsx` warns that reach, range and areas aren't checked for a
  combatant off a map in use.
- **Decide first** whether the GM wants this; then a setting in `CombatPanel.tsx`.

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
| R10 | Combatant ids in results | `0d8c00f` (main) | target names in the dice tray (spell, save effect and follow-up targets) are links: a click selects the combatant (rail and map) and pings its square (`DiceTray.tsx` `TargetName`, `useUi.focus`, `EncounterPage.tsx`) |
| R11 | Option previews | `2144460` (main) | each builder option shows what it would change ("AC 16 → 17", `ChoiceCard.tsx` `PreviewLine`, facade `optionPreviews`, `useOptionPreviews`), Ability Score Improvement rows too; not on the sheet's "Today's picks" (the saved build isn't the build as played) |
| R12 | `unassignedValues` | `5dbf55e` (main) | the ability selects offer only the engine's unassigned values plus the ability's own (`AbilitiesView.unassigned`); the swap convenience is gone |
| R9 | Rolls outside an encounter | `51d904d` (main) | sheet roll buttons (checks, saves, attack rolls) call `rollCheck` (facade, `rollTest` in `store/dice.ts`); the tray shows mode, reasons, outcome |
