/**
 * The engine's fixed lists and names (abilities, skills, damage types, alignments, steps), loaded
 * from the facade once at startup: the main thread imports engine types, never engine code.
 */

import type { Ability, Alignment, DamageType, Skill, Step } from "srd-rules-engine";
import type { EngineConstants, EngineFacade } from "./facade";

let loaded: EngineConstants | null = null;

export async function loadConstants(engine: EngineFacade): Promise<void> {
  loaded = await engine.constants();
}

export function constants(): EngineConstants {
  if (!loaded) throw new Error("Engine constants aren't loaded yet (loadConstants at startup)");
  return loaded;
}

export const abilities = (): readonly Ability[] => constants().abilities.map((a) => a.id);
export const abilityName = (id: Ability | string): string =>
  constants().abilities.find((a) => a.id === id)?.name ?? id;
export const skills = (): readonly Skill[] => constants().skills.map((s) => s.id);
export const skillName = (id: Skill | string): string =>
  constants().skills.find((s) => s.id === id)?.name ?? id;
export const damageTypes = (): readonly DamageType[] => constants().damage_types;
export const alignments = (): readonly { id: Alignment; name: string }[] => constants().alignments;
export const steps = (): readonly Step[] => constants().steps.map((s) => s.id);
