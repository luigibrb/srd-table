/**
 * Free rolls (`2d6+3`, a Hit Die for a level-up), rolled by the engine's dice in the worker and
 * shown in the dice tray. The UI never rolls.
 */

import type { AbilityRoll, DamagePart, RollResult } from "srd-rules-engine";
import { engine } from "@/engine/client";
import type { Outcome } from "@/engine/facade";
import { useUi } from "./ui";

export async function rollDice(
  expression: string,
  who: string,
): Promise<Outcome<{ roll: RollResult }>> {
  const result = await engine().roll(expression);
  if (result.ok) useUi.getState().showDice([{ kind: "roll", who, roll: result.roll }]);
  return result;
}

/** Six ability scores rolled (4d6, drop the lowest) with the engine's dice, shown in the tray. */
export async function rollAbilityPool(who: string): Promise<readonly AbilityRoll[]> {
  const rolls = await engine().rollAbilityScores();
  useUi.getState().showDice(
    rolls.map((r) => ({
      kind: "roll" as const,
      who,
      roll: { dice_expression: "4d6", rolls: r.rolls, modifier: -r.dropped, total: r.total },
    })),
  );
  return rolls;
}

/** Roll an attack's damage parts with the engine's dice, shown in the tray. */
export async function rollDamage(parts: readonly DamagePart[], critical: boolean, who: string) {
  const damage = await engine().rollDamage(parts, critical);
  useUi.getState().showDice([{ kind: "damage", who, damage }]);
  return damage;
}
