/**
 * The engine's words in other languages: one `EngineLanguage` per locale, rendered in the engine
 * worker (`src/engine/messages.ts`). English needs none: the engine's own text is English.
 *
 * Adding a language: a file like `it.ts` with every message code (`MessageCode`: a missing one
 * fails the typecheck) and the names below, registered in `ENGINE_LANGUAGES`; plus the app's own
 * words (`src/i18n/<locale>.ts`) and an entry in `LOCALES` (`src/i18n/index.ts`).
 */

import type { Alignment, MessageCode, Step } from "srd-rules-engine";
import { ENGINE_IT, ENGINE_NAMES_IT } from "./it";

/** The sheet numbers `previewOption` reports that aren't abilities. */
export type StatId = "armor_class" | "max_hp" | "initiative" | "speed" | "passive_perception";

export interface EngineLanguage {
  /** A template for every message code, in the engine's syntax. */
  readonly messages: Readonly<Record<MessageCode, string>>;
  /**
   * Names of engine ids without a message code yet (the builder's steps, alignments, the stats a
   * builder option previews). Abilities and skills come from `messages` (`ability.*`, `skill.*`).
   */
  readonly steps: Readonly<Record<Step, string>>;
  readonly alignments: Readonly<Record<Alignment, string>>;
  readonly stats: Readonly<Record<StatId, string>>;
}

export const ENGINE_LANGUAGES: Readonly<Record<string, EngineLanguage>> = {
  it: { messages: ENGINE_IT, ...ENGINE_NAMES_IT },
};
