/**
 * Levels after the first: level up (a class from `levelUpOptions`, fixed or rolled Hit Points),
 * remove the last level, and edit a past level (its class with a preview, its Hit Points, and
 * every choice made at it, replacements included).
 */

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { OptionButton } from "@/components/OptionButton";
import { Button, Dialog, Reasons, Section } from "@/components/ui";
import { steps } from "@/engine/constants";
import type { BuildEdit, BuildView, LevelUpOption, LevelView } from "@/engine/facade";
import { t } from "@/i18n";
import { useDocuments } from "@/store/documents";
import { ChoiceCard } from "./ChoiceCard";

export function LevelUpDialog({
  id,
  view,
  open,
  onOpenChange,
  onDone,
}: {
  id: string;
  view: BuildView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (level: number) => void;
}) {
  const levelUp = useDocuments((s) => s.levelUp);
  const [classId, setClassId] = useState<string | null>(
    view.build.levels.at(-1)?.class_id ?? view.build.class_id,
  );
  const [reasons, setReasons] = useState<readonly string[] | null>(null);
  const options = [...view.level_up_options].sort(
    (a, b) => (a.unavailable ? 1 : 0) - (b.unavailable ? 1 : 0) || a.name.localeCompare(b.name),
  );
  const chosen = options.find((o) => o.class_id === classId) ?? null;

  async function go(hp: "fixed" | "roll") {
    if (!chosen) return;
    const result = await levelUp(id, chosen.class_id, hp);
    if (!result.ok) return setReasons(result.reasons);
    setReasons(null);
    onOpenChange(false);
    onDone(view.level + 1);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("builder.levelUp")}
      description={t("builder.pickClass")}
      wide
      footer={
        chosen && !chosen.unavailable ? (
          <>
            <Button icon="heart" onClick={() => void go("fixed")}>
              {t("builder.hpFixed", { hp: chosen.fixed_hp })}
            </Button>
            <Button variant="primary" icon="d20" onClick={() => void go("roll")}>
              {t("builder.hpRoll", { die: chosen.hit_die })}
            </Button>
          </>
        ) : null
      }
    >
      <Reasons reasons={reasons} className="mb-2" />
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {options.map((o: LevelUpOption) => (
          <li key={o.class_id}>
            <OptionButton
              reason={o.unavailable}
              on={classId === o.class_id}
              icon={classId === o.class_id ? "check" : undefined}
              onClick={() => setClassId(o.class_id)}
              detail={`${o.name} ${o.class_level} · d${o.hit_die}`}
            >
              {o.name}
            </OptionButton>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

/** A past (or the latest) level: its class, its Hit Points, and its choices. */
export function LevelPanel({
  id,
  view,
  level,
  request,
}: {
  id: string;
  view: BuildView;
  level: LevelView;
  request: (edit: BuildEdit, options?: { past?: boolean }) => Promise<readonly string[] | null>;
}) {
  const setLevelHp = useDocuments((s) => s.setLevelHp);
  const [reasons, setReasons] = useState<readonly string[] | null>(null);
  const past = level.level < view.level;
  const choices = view.choices
    .filter((c) => c.level === level.level)
    .sort((a, b) => steps().indexOf(a.step) - steps().indexOf(b.step));
  const option = view.level_up_options.find((o) => o.class_id === level.class_id);
  const className = option?.name ?? level.class_id;

  return (
    <div className="space-y-4">
      <Section title={t("builder.levelOf", { level: level.level })}>
        <Reasons reasons={reasons} className="mb-2" />
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-ink-muted">
              {t("builder.pickClassFor", { level: level.level })}
            </span>
            <select
              className="field min-w-[12rem]"
              value={level.class_id}
              onChange={async (e) =>
                setReasons(
                  await request(
                    { type: "level_class", level: level.level, class_id: e.target.value },
                    { past: true },
                  ),
                )
              }
            >
              {view.level_up_options.map((o) => (
                <option key={o.class_id} value={o.class_id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-ink-muted">
              {t("builder.hp")} · {className} {level.class_level}
            </span>
            <div className="flex gap-2">
              <Button
                on={level.hp === null}
                onClick={async () => {
                  const r = await setLevelHp(id, level.level, "fixed");
                  setReasons(r.ok ? null : r.reasons);
                }}
              >
                {t("builder.hpFixed", { hp: option?.fixed_hp ?? "" })}
              </Button>
              <Button
                icon="d20"
                on={level.hp !== null}
                onClick={async () => {
                  const r = await setLevelHp(id, level.level, "roll");
                  setReasons(r.ok ? null : r.reasons);
                }}
              >
                {level.hp !== null
                  ? t("builder.hpRolled", { roll: level.hp })
                  : t("builder.hpRoll", { die: option?.hit_die ?? "" })}
              </Button>
            </div>
          </div>
        </div>
        {level.issues.length > 0 && (
          <ul className="mt-3 space-y-0.5 text-sm">
            {level.issues.map((i) => (
              <li
                key={`${i.choice_key}|${i.message}`}
                className={i.severity === "error" ? "text-red" : "text-orange"}
              >
                {i.message}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <h2 className="section-title">{t("builder.levelChoices", { level: level.level })}</h2>
      {choices.length === 0 ? (
        <p className="text-ink-muted">{t("builder.noChoices")}</p>
      ) : (
        choices.map((c) => (
          <ChoiceCard
            key={c.key}
            choice={c}
            characterId={id}
            past={past}
            onPick={(values) => request({ type: "choice", key: c.key, values }, { past })}
          />
        ))
      )}
    </div>
  );
}

export function RemoveLevelButton({
  view,
  request,
}: {
  view: BuildView;
  request: (edit: BuildEdit) => Promise<readonly string[] | null>;
}) {
  const [confirm, setConfirm] = useState(false);
  const [reasons, setReasons] = useState<readonly string[] | null>(null);
  if (view.level < 2) return null;
  return (
    <>
      <Button size="sm" variant="danger" icon="trash" onClick={() => setConfirm(true)}>
        {t("builder.removeLevel", { level: view.level })}
      </Button>
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("builder.removeLevel", { level: view.level })}
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>{t("common.cancel")}</Button>
            <Button
              variant="danger"
              icon="trash"
              onClick={async () => {
                const r = await request({ type: "remove_level" });
                setReasons(r);
                if (!r) setConfirm(false);
              }}
            >
              {t("common.remove")}
            </Button>
          </>
        }
      >
        <Reasons reasons={reasons} />
        <p className="flex items-center gap-2 text-ink-muted">
          <Icon name="warning" className="text-orange" />
          {t("builder.removeLevel", { level: view.level })}
        </p>
      </Dialog>
    </>
  );
}
