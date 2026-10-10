/**
 * The language the app is shown in. A change in the settings is applied in order: the engine
 * worker renders its texts in it (`setLocale`), the engine's names (abilities, skills, steps,
 * alignments) are reloaded, the app's catalog switches, and only then `applied` changes: the app
 * remounts under it (`App.tsx`) and every derived view is fetched again (its query keys hold it).
 */

import { create } from "zustand";
import { engine } from "@/engine/client";
import { loadConstants } from "@/engine/constants";
import { setLocale } from "@/i18n";
import { useSettings } from "./settings";

export const useLocale = create<{ applied: string }>()(() => ({ applied: "en" }));

export async function applyLocale(locale: string): Promise<void> {
  await engine().setLocale(locale);
  await loadConstants(engine());
  setLocale(locale);
  if (typeof document !== "undefined") document.documentElement.lang = locale;
  useLocale.setState({ applied: locale });
}

/** Apply the settings' language whenever it changes; returns the unsubscribe. */
export function startLocaleSync(): () => void {
  let last = useLocale.getState().applied;
  return useSettings.subscribe((s) => {
    const locale = s.settings.locale;
    if (locale === last) return;
    last = locale;
    void applyLocale(locale);
  });
}
