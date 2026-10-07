/** The builder's live panel: HP, AC, Initiative, Speed, Passive Perception, each explained. */

import { Explain } from "@/components/Explain";
import { Section, StatBox } from "@/components/ui";
import { abilities, abilityName } from "@/engine/constants";
import type { BuildView } from "@/engine/facade";
import { signed, t } from "@/i18n";

export function Summary({ view }: { view: BuildView }) {
  const { sheet } = view;
  return (
    <Section title={t("builder.summary")}>
      <div className="grid grid-cols-3 gap-2">
        <StatBox label={t("summary.hp")}>
          {sheet.max_hp ? (
            <Explain
              label={t("summary.hp")}
              total={sheet.max_hp.total}
              parts={sheet.max_hp.parts}
            />
          ) : (
            "—"
          )}
        </StatBox>
        <StatBox label={t("summary.ac")}>
          <Explain
            label={t("summary.ac")}
            total={sheet.armor_class.total}
            parts={sheet.armor_class.parts}
          />
        </StatBox>
        <StatBox label={t("summary.initiative")}>
          <Explain
            label={t("summary.initiative")}
            total={sheet.initiative.total}
            parts={sheet.initiative.parts}
            sign
          />
        </StatBox>
        <StatBox label={t("summary.speed")}>
          <Explain label={t("summary.speed")} total={sheet.speed.total} parts={sheet.speed.parts} />
        </StatBox>
        <StatBox label={t("summary.passive")} className="col-span-2">
          {sheet.passive_perception}
        </StatBox>
      </div>
      <dl className="mt-3 grid grid-cols-6 gap-1 text-center">
        {abilities().map((a) => (
          <div key={a} className="rounded border border-edge bg-card-2 py-1">
            <dt className="text-[13px] text-ink-muted uppercase" title={abilityName(a)}>
              {a}
            </dt>
            <dd className="font-semibold tabular-nums">{sheet.scores[a]}</dd>
            <dd className="text-[13px] text-ink-muted tabular-nums">
              {signed(sheet.modifiers[a])}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-sm text-ink-muted">
        {t("summary.prof")} {signed(sheet.proficiency_bonus)}
        {sheet.classes.length > 0 &&
          ` · ${sheet.classes.map((c) => `${c.name} ${c.level}${c.subclass ? ` (${c.subclass})` : ""}`).join(" / ")}`}
      </p>
      {sheet.warnings.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-sm text-orange">
          {sheet.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </Section>
  );
}
