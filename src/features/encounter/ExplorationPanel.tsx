/**
 * Outside a fight, in place of the quick bar: exploring. Characters move freely on the map (the
 * engine says how many turns a move takes); the acting character can Search; the GM sets the
 * travel pace and who stops when a hidden point is noticed, and answers a halt (reveal the point
 * or let everyone go on). Every control is an encounter action.
 */

import { useState } from "react";
import type { Encounter, EncounterAction } from "srd-rules-engine";
import { Icon } from "@/components/Icon";
import { Button, Reasons } from "@/components/ui";
import type { CombatantView, EncounterView } from "@/engine/facade";
import { t } from "@/i18n";
import { useDocuments } from "@/store/documents";
import { useTableUi } from "./tableUi";

const PACES = ["slow", "normal", "fast"] as const;
const STOPS = ["noticer", "everyone"] as const;

export function ExplorationPanel({
  encounterId,
  encounter,
  view,
  actor,
  gm,
}: {
  encounterId: string;
  encounter: Encounter;
  view: EncounterView;
  actor: CombatantView | null;
  gm: boolean;
}) {
  const send = useDocuments((s) => s.encounterAction);
  const openPoint = useTableUi((s) => s.openPoint);
  const setTool = useTableUi((s) => s.setTool);
  const [reasons, setReasons] = useState<readonly string[] | null>(null);
  async function act(action: EncounterAction) {
    const result = await send(encounterId, action);
    setReasons(result.ok ? null : result.reasons);
  }
  const halted = encounter.halted
    ? encounter.points.find((p) => p.id === encounter.halted)
    : undefined;
  const noticer = halted
    ? view.combatants.find((c) => halted.noticed_by.includes(c.id))?.name
    : undefined;

  return (
    <section aria-label={t("explore.title")} className="panel space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="section-title">{t("explore.title")}</h2>
        <p className="min-w-0 flex-1 text-sm text-ink-muted">{t("explore.hint")}</p>
        {actor && (
          <>
            <Button size="sm" icon="move" onClick={() => setTool("move")}>
              {t("explore.move", { name: actor.name })}
            </Button>
            <Button
              size="sm"
              icon="search"
              onClick={() => void act({ type: "search", id: actor.id })}
            >
              {t("explore.search", { name: actor.name })}
            </Button>
          </>
        )}
      </div>

      {halted && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 border-l-4 border-l-orange bg-card-2 px-3 py-2"
        >
          <Icon name="warning" size={18} className="flex-none text-orange" />
          <p className="min-w-0 flex-1 font-bold">
            {t("explore.halted", { name: noticer ?? t("explore.someone") })}
          </p>
          {gm ? (
            <>
              <Button size="sm" icon="pin" onClick={() => openPoint(halted.id)}>
                {t("explore.openPoint")}
              </Button>
              <Button size="sm" icon="next" onClick={() => void act({ type: "resume" })}>
                {t("explore.goOn")}
              </Button>
            </>
          ) : (
            <p className="w-full text-sm text-ink-muted">{t("explore.waitGm")}</p>
          )}
        </div>
      )}

      <Reasons reasons={reasons} />

      {gm && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-edge pt-2 text-sm">
          <fieldset className="flex flex-wrap items-center gap-1.5">
            <legend className="sr-only">{t("explore.pace")}</legend>
            <span className="mr-1 text-ink-muted" aria-hidden="true">
              {t("explore.pace")}
            </span>
            {PACES.map((pace) => (
              <Button
                key={pace}
                size="sm"
                on={encounter.pace === pace}
                aria-pressed={encounter.pace === pace}
                onClick={() => void act({ type: "set_exploration", pace })}
              >
                {t(`explore.pace.${pace}`)}
              </Button>
            ))}
          </fieldset>
          <fieldset className="flex flex-wrap items-center gap-1.5">
            <legend className="sr-only">{t("explore.stops")}</legend>
            <span className="mr-1 text-ink-muted" aria-hidden="true">
              {t("explore.stops")}
            </span>
            {STOPS.map((stops) => (
              <Button
                key={stops}
                size="sm"
                on={encounter.notice_stops === stops}
                aria-pressed={encounter.notice_stops === stops}
                onClick={() => void act({ type: "set_exploration", notice_stops: stops })}
              >
                {t(`explore.stops.${stops}`)}
              </Button>
            ))}
          </fieldset>
        </div>
      )}
    </section>
  );
}
