/**
 * Points of interest: the open point in the side panel (its text for everyone once revealed;
 * the GM's notes, who noticed it, reveal or hide, edit, remove), and the GM's dialog to add or
 * edit one. Every change is an encounter action; noticing is the engine's.
 */

import { useState } from "react";
import type { Encounter, EncounterAction, PointKind, PointOfInterest } from "srd-rules-engine";
import { Icon } from "@/components/Icon";
import { Button, Dialog, Reasons, Section } from "@/components/ui";
import { pointKinds } from "@/engine/constants";
import type { EncounterView } from "@/engine/facade";
import { formatList, t } from "@/i18n";
import { useDocuments } from "@/store/documents";
import { POINT_ICON } from "../map/BattleMap";
import { useTableUi } from "./tableUi";

export function PointPanel({
  encounterId,
  encounter,
  view,
  gm,
}: {
  encounterId: string;
  encounter: Encounter;
  view: EncounterView;
  gm: boolean;
}) {
  const id = useTableUi((s) => s.point);
  const openPoint = useTableUi((s) => s.openPoint);
  const send = useDocuments((s) => s.encounterAction);
  const [reasons, setReasons] = useState<readonly string[] | null>(null);
  const [editing, setEditing] = useState(false);
  const point = encounter.points.find((p) => p.id === id);
  if (!point || (!gm && !point.revealed)) return null;

  async function act(action: EncounterAction) {
    const result = await send(encounterId, action);
    setReasons(result.ok ? null : result.reasons);
    return result.ok;
  }
  const names = point.noticed_by.map((c) => view.combatants.find((x) => x.id === c)?.name ?? c);

  return (
    <Section
      title={
        <span className="flex items-center gap-2">
          <Icon name={POINT_ICON[point.kind]} size={18} />
          {point.title}
        </span>
      }
      actions={
        <Button
          variant="ghost"
          icon="x"
          iconOnly
          label={t("common.close")}
          onClick={() => openPoint(null)}
        />
      }
    >
      <p className="mb-2 text-[13px] text-ink-muted">
        {t(`points.kind.${point.kind}`)}
        {gm && ` · ${point.revealed ? t("points.revealed") : t("points.hidden")}`}
      </p>
      {point.text && <p className="mb-3 whitespace-pre-line">{point.text}</p>}
      {gm && (
        <div className="space-y-2 border-t border-edge pt-2 text-sm">
          {point.notes && (
            <div>
              <div className="font-bold">{t("points.notes")}</div>
              <p className="whitespace-pre-line text-ink-muted">{point.notes}</p>
            </div>
          )}
          <p className="text-ink-muted">
            {point.dc === null
              ? t("points.gmOnly")
              : t("points.noticeWith", { dc: point.dc, within: point.within })}
          </p>
          {!point.revealed && (
            <p className={names.length ? "font-bold text-orange" : "text-ink-muted"}>
              {names.length
                ? t("points.noticedBy", { names: formatList(names) })
                : t("points.notNoticed")}
            </p>
          )}
          <Reasons reasons={reasons} />
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={point.revealed ? "normal" : "primary"}
              icon="eye"
              onClick={() =>
                void act({ type: "update_point", id: point.id, revealed: !point.revealed })
              }
            >
              {point.revealed ? t("points.hide") : t("points.reveal")}
            </Button>
            <Button size="sm" icon="edit" onClick={() => setEditing(true)}>
              {t("common.edit")}
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon="trash"
              onClick={() =>
                void act({ type: "remove_point", id: point.id }).then((ok) => ok && openPoint(null))
              }
            >
              {t("common.remove")}
            </Button>
          </div>
        </div>
      )}
      {editing && (
        <PointDialog
          encounterId={encounterId}
          point={point}
          at={point.at}
          onClose={() => setEditing(false)}
        />
      )}
    </Section>
  );
}

/** The GM's form for a new point (at a square) or an existing one. */
export function PointDialog({
  encounterId,
  point,
  at,
  onClose,
}: {
  encounterId: string;
  point?: PointOfInterest;
  at: { x: number; y: number };
  onClose: () => void;
}) {
  const send = useDocuments((s) => s.encounterAction);
  const openPoint = useTableUi((s) => s.openPoint);
  const [title, setTitle] = useState(point?.title ?? "");
  const [kind, setKind] = useState<PointKind>(point?.kind ?? "detail");
  const [text, setText] = useState(point?.text ?? "");
  const [notes, setNotes] = useState(point?.notes ?? "");
  const [noticeable, setNoticeable] = useState(point ? point.dc !== null : true);
  const [dc, setDc] = useState(String(point?.dc ?? 12));
  const [within, setWithin] = useState(String(point?.within ?? 30));
  const [revealed, setRevealed] = useState(point?.revealed ?? false);
  const [reasons, setReasons] = useState<readonly string[] | null>(null);

  async function save() {
    const fields = {
      title: title.trim(),
      kind,
      text,
      notes,
      revealed,
      dc: noticeable ? Number.parseInt(dc, 10) || 0 : null,
      within: Number.parseInt(within, 10) || 0,
    };
    const action: EncounterAction = point
      ? { type: "update_point", id: point.id, ...fields }
      : { type: "add_point", at, ...fields };
    const before = useDocuments.getState().encounters[encounterId]?.encounter.next_point ?? 0;
    const result = await send(encounterId, action);
    if (!result.ok) return setReasons(result.reasons);
    if (!point) openPoint(`poi${before}`);
    onClose();
  }

  const id = (name: string) => `point-${point?.id ?? "new"}-${name}`;
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={point ? t("points.edit") : t("points.add")}
      footer={
        <>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            variant="primary"
            icon="check"
            disabled={!title.trim()}
            onClick={() => void save()}
          >
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <label className="grid gap-1" htmlFor={id("title")}>
          <span className="text-sm font-bold">{t("points.title")}</span>
          <input
            id={id("title")}
            className="field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="grid gap-1" htmlFor={id("kind")}>
          <span className="text-sm font-bold">{t("points.kind")}</span>
          <select
            id={id("kind")}
            className="field"
            value={kind}
            onChange={(e) => setKind(e.target.value as PointKind)}
          >
            {pointKinds().map((k) => (
              <option key={k} value={k}>
                {t(`points.kind.${k}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1" htmlFor={id("text")}>
          <span className="text-sm font-bold">{t("points.text")}</span>
          <textarea
            id={id("text")}
            className="field min-h-20"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <label className="grid gap-1" htmlFor={id("notes")}>
          <span className="text-sm font-bold">{t("points.notes")}</span>
          <textarea
            id={id("notes")}
            className="field min-h-16"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="accent-[var(--blue)]"
            checked={noticeable}
            onChange={(e) => setNoticeable(e.target.checked)}
          />
          {t("points.noticeable")}
        </label>
        {noticeable && (
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2" htmlFor={id("dc")}>
              {t("points.dc")}
              <input
                id={id("dc")}
                className="field w-16"
                inputMode="numeric"
                value={dc}
                onChange={(e) => setDc(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </label>
            <label className="flex items-center gap-2" htmlFor={id("within")}>
              {t("points.within")}
              <input
                id={id("within")}
                className="field w-16"
                inputMode="numeric"
                value={within}
                onChange={(e) => setWithin(e.target.value.replace(/[^0-9]/g, ""))}
              />
              {t("points.feet")}
            </label>
          </div>
        )}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="accent-[var(--blue)]"
            checked={revealed}
            onChange={(e) => setRevealed(e.target.checked)}
          />
          {t("points.revealedNow")}
        </label>
        <Reasons reasons={reasons} />
      </div>
    </Dialog>
  );
}
