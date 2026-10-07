/**
 * The Initiative order down the left side: each combatant with its Initiative, HP, AC,
 * conditions and Concentration; a stripe in its side's colour; the one whose turn it is is
 * highlighted. Players don't see monsters' HP
 * numbers.
 */

import { Icon } from "@/components/Icon";
import { Portrait } from "@/components/Portrait";
import { cx, HpBar } from "@/components/ui";
import type { CombatantView, EncounterView } from "@/engine/facade";
import { t } from "@/i18n";
import { ConditionMedal } from "../sheet/HitPoints";
import { alliedSides, useTableUi } from "./tableUi";

export function InitiativeRail({ view, gm }: { view: EncounterView; gm: boolean }) {
  const selected = useTableUi((s) => s.selected);
  const select = useTableUi((s) => s.select);
  const allies = alliedSides(view);
  return (
    <nav aria-label={t("table.initiative")} className="min-h-0 overflow-y-auto">
      <ol className="space-y-1.5">
        {view.combatants.map((c) => (
          <li key={c.id}>
            <RailEntry
              c={c}
              current={view.current === c.id}
              selected={selected === c.id}
              allied={allies.has(c.side)}
              showHp={gm || c.character !== null}
              onSelect={() => select(c.id)}
            />
          </li>
        ))}
      </ol>
    </nav>
  );
}

function RailEntry({
  c,
  current,
  selected,
  allied,
  showHp,
  onSelect,
}: {
  c: CombatantView;
  current: boolean;
  selected: boolean;
  allied: boolean;
  showHp: boolean;
  onSelect: () => void;
}) {
  const down = c.defeated || c.dead;
  const status = c.dead
    ? t("table.dead")
    : c.defeated
      ? t("table.defeated")
      : c.dying
        ? t("table.dying")
        : null;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={current ? "true" : undefined}
      aria-pressed={selected}
      className={cx(
        "flex w-full items-stretch gap-2 rounded border border-l-4 bg-card p-1.5 text-left shadow-card transition-colors",
        allied ? "!border-l-blue" : "!border-l-red",
        selected ? "border-blue ring-1 ring-blue" : "border-edge hover:border-edge-strong",
        current && "outline-2 -outline-offset-1 outline-hl",
        down && "opacity-55",
      )}
    >
      <div className="relative">
        <Portrait id={c.character} name={c.name} size={56} />
        <span
          className={cx(
            "absolute -top-1.5 -left-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border px-1 text-[13px] font-bold tabular-nums",
            current ? "border-ink bg-hl text-hl-ink" : "border-edge-strong bg-card-2 text-ink",
          )}
          title={t("table.initiative")}
        >
          {c.initiative ?? "–"}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1">
          <span
            className={cx(
              "truncate font-display text-lg leading-tight",
              current ? "hl" : "text-ink",
            )}
          >
            {c.name}
          </span>
          {c.concentration && (
            <Icon name="concentration" size={14} className="flex-none text-purple" />
          )}
        </div>
        {c.error ? (
          <span className="text-[13px] text-red">{t("table.characterMissing")}</span>
        ) : (
          <>
            <div className="flex items-baseline gap-2 text-sm">
              {showHp ? (
                <span className="tabular-nums">
                  <span className="font-semibold">{c.hp}</span>
                  <span className="text-ink-muted">/{c.max_hp}</span>
                  {c.temp_hp > 0 && <span className="text-blue"> +{c.temp_hp}</span>}
                </span>
              ) : (
                <span className="text-ink-muted">{status ?? ""}</span>
              )}
              <span className="ml-auto flex items-center gap-0.5 text-[13px] text-ink-muted">
                <Icon name="shield" size={13} />
                {c.armor_class}
              </span>
            </div>
            {showHp && <HpBar hp={c.hp} max={c.max_hp} temp={c.temp_hp} className="my-1" />}
            {status && showHp && <div className="text-[13px] font-semibold text-red">{status}</div>}
            {c.conditions.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {c.conditions.map((cond) => (
                  <ConditionMedal key={cond.id} label={cond.name} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </button>
  );
}
