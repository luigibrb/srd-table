/**
 * Ability scores: the method (standard array, point buy, 4d6), the base scores, the background's
 * bonuses. The engine validates every assignment (`setBaseScores`, `setBackgroundBonus`) and
 * reports point-buy costs (`pointBuyStatus`); the final scores come from the sheet.
 */

import { useEffect, useState } from "react";
import type { Ability, AbilityMap, AbilityMethod } from "srd-rules-engine";
import { Explain } from "@/components/Explain";
import { Button, Reasons, Section } from "@/components/ui";
import { abilities as abilityIds, abilityName } from "@/engine/constants";
import type { BuildEdit, BuildView } from "@/engine/facade";
import { signed, t } from "@/i18n";
import { rollAbilityPool } from "@/store/dice";

const METHODS: readonly AbilityMethod[] = ["standard_array", "point_buy", "roll"];

export function AbilitiesStep({
  view,
  name,
  edit,
}: {
  view: BuildView;
  name: string;
  edit: (e: BuildEdit) => Promise<readonly string[] | null>;
}) {
  const [reasons, setReasons] = useState<readonly string[] | null>(null);
  const { abilities, build, sheet } = view;
  const run = async (e: BuildEdit) => setReasons(await edit(e));
  // The background's bonuses are one pattern (+2/+1 or +1/+1/+1): picked here, sent together.
  const savedBonus = JSON.stringify(build.background_bonus);
  const [bonusDraft, setBonusDraft] = useState<AbilityMap>(build.background_bonus);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset the draft when the saved bonus changes
  useEffect(() => setBonusDraft(build.background_bonus), [savedBonus]);

  async function chooseMethod(method: AbilityMethod) {
    if (method === "roll") {
      const pool = await rollAbilityPool(name);
      await run({ type: "ability_method", method, pool: pool.map((r) => r.total) });
    } else {
      await run({ type: "ability_method", method });
    }
  }

  return (
    <div className="space-y-4">
      <Reasons reasons={reasons} />
      <Section title={t("builder.method")}>
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">{t("builder.method")}</legend>
          {METHODS.map((m) => (
            <Button key={m} on={abilities.method === m} onClick={() => void chooseMethod(m)}>
              {t(`builder.method.${m}`)}
            </Button>
          ))}
          {abilities.method === "roll" && (
            <Button icon="d6" onClick={() => void chooseMethod("roll")}>
              {t("builder.reroll")}
            </Button>
          )}
        </fieldset>
        {abilities.method === "roll" && abilities.rolled_pool.length > 0 && (
          <p className="mt-2 text-sm text-ink-muted">{abilities.rolled_pool.join(" · ")}</p>
        )}
        {abilities.point_buy && (
          <p className="mt-2 font-semibold text-gold">
            {t("builder.pointsLeft", {
              remaining: abilities.point_buy.remaining,
              budget: abilities.point_buy.budget,
            })}
          </p>
        )}
      </Section>

      {abilities.method && (
        <Section title={t("sheet.abilities")}>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[13px] tracking-wider text-ink-muted uppercase">
                <th className="py-1 font-normal">{t("sheet.abilities")}</th>
                <th className="py-1 font-normal">{t("builder.base")}</th>
                <th className="py-1 font-normal">{t("builder.backgroundBonus")}</th>
                <th className="py-1 text-right font-normal">{t("builder.final")}</th>
              </tr>
            </thead>
            <tbody>
              {abilityIds().map((a) => (
                <tr key={a} className="border-t border-line">
                  <th scope="row" className="py-1.5 pr-2 font-semibold">
                    {abilityName(a)}
                  </th>
                  <td className="py-1.5 pr-2">
                    <BaseScore
                      ability={a}
                      view={view}
                      onScores={(scores) => run({ type: "base_scores", scores })}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <BonusPicker
                      ability={a}
                      view={view}
                      draft={bonusDraft}
                      onDraft={setBonusDraft}
                    />
                  </td>
                  <td className="py-1.5 text-right">
                    <span className="font-display text-xl font-bold">{sheet.scores[a]}</span>{" "}
                    <span className="text-ink-muted">({signed(sheet.modifiers[a])})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {abilities.background_abilities.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-muted">{t("builder.backgroundBonusHint")}</span>
              <Button
                size="sm"
                variant="gold"
                icon="check"
                disabled={sameBonus(bonusDraft, build.background_bonus)}
                onClick={() => void run({ type: "background_bonus", bonus: bonusDraft })}
              >
                {t("builder.applyBonus")}
              </Button>
            </div>
          )}
          {!build.background_id && (
            <p className="mt-2 text-sm text-ink-muted">{t("builder.backgroundFirst")}</p>
          )}
          {sheet.max_hp && (
            <p className="mt-3 text-sm text-ink-muted">
              {t("summary.hp")}{" "}
              <Explain
                label={t("summary.hp")}
                total={sheet.max_hp.total}
                parts={sheet.max_hp.parts}
              />
            </p>
          )}
        </Section>
      )}
    </div>
  );
}

function BaseScore({
  ability,
  view,
  onScores,
}: {
  ability: Ability;
  view: BuildView;
  onScores: (scores: AbilityMap) => void;
}) {
  const { abilities, build } = view;
  const base = build.base_scores;
  const current = base[ability];
  const label = `${abilityName(ability)}: ${t("builder.base")}`;

  if (abilities.method === "point_buy" && abilities.point_buy) {
    const status = abilities.point_buy.abilities[ability];
    // The engine's scores for every ability (it counts an unset one as the minimum).
    const scores = Object.fromEntries(
      abilityIds().map((a) => [a, abilities.point_buy?.abilities[a].score]),
    ) as AbilityMap;
    const score = status.score;
    return (
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          icon="minus"
          iconOnly
          label={`${label} −1`}
          disabled={!status.can_decrease}
          onClick={() => onScores({ ...scores, [ability]: score - 1 })}
        />
        <output
          className="w-7 text-center font-semibold tabular-nums"
          aria-label={`${label} ${score}`}
        >
          {score}
        </output>
        <Button
          size="sm"
          icon="plus"
          iconOnly
          label={`${label} +1`}
          disabled={!status.can_increase}
          onClick={() => onScores({ ...scores, [ability]: score + 1 })}
        />
        {status.increase_cost !== null && (
          <span className="text-[13px] text-ink-faint">+{status.increase_cost}</span>
        )}
      </div>
    );
  }

  const pool =
    abilities.method === "standard_array" ? abilities.standard_array : abilities.rolled_pool;
  const values = [...new Set(pool)].sort((a, b) => b - a);
  return (
    <select
      className="field max-w-[6rem]"
      aria-label={label}
      value={current ?? ""}
      onChange={(e) => {
        const value = e.target.value === "" ? undefined : Number(e.target.value);
        onScores(assign(base, ability, value, pool));
      }}
    >
      <option value="">{t("builder.unassigned")}</option>
      {values.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  );
}

/**
 * Put `value` on `ability`; if another ability already holds the last copy of that value, the two
 * swap (a convenience: the engine still validates the result).
 */
function assign(
  base: AbilityMap,
  ability: Ability,
  value: number | undefined,
  pool: readonly number[],
): AbilityMap {
  const next: Record<string, number | undefined> = { ...base, [ability]: value };
  if (value !== undefined) {
    const copies = pool.filter((v) => v === value).length;
    const holders = abilityIds().filter((a) => next[a] === value);
    if (holders.length > copies) {
      const other = holders.find((a) => a !== ability);
      if (other) next[other] = base[ability];
    }
  }
  return Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)) as AbilityMap;
}

function sameBonus(a: AbilityMap, b: AbilityMap): boolean {
  return abilityIds().every((x) => (a[x] ?? 0) === (b[x] ?? 0));
}

function BonusPicker({
  ability,
  view,
  draft,
  onDraft,
}: {
  ability: Ability;
  view: BuildView;
  draft: AbilityMap;
  onDraft: (bonus: AbilityMap) => void;
}) {
  const { abilities } = view;
  if (!abilities.background_abilities.includes(ability))
    return <span className="text-ink-faint">—</span>;
  const current = draft[ability] ?? 0;
  return (
    <select
      className="field max-w-[5rem]"
      aria-label={`${abilityName(ability)}: ${t("builder.backgroundBonus")}`}
      value={current}
      onChange={(e) => {
        const value = Number(e.target.value);
        const next: Record<string, number> = { ...draft, [ability]: value };
        if (value === 0) delete next[ability];
        onDraft(next as AbilityMap);
      }}
    >
      {[0, 1, 2].map((v) => (
        <option key={v} value={v}>
          {v === 0 ? "—" : `+${v}`}
        </option>
      ))}
    </select>
  );
}
