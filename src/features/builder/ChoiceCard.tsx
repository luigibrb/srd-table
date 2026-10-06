/**
 * One of the engine's choices: every option it lists, those that can't be picked greyed out with
 * the engine's reason. Picks go to `setChoice` (through a preview); a refusal shows its reasons
 * here. Repeatable picks (Ability Score Improvement) have a count per option; replacements
 * ("Replace one…") pick `[old, new]`.
 */

import { Popover } from "radix-ui";
import { useMemo, useState } from "react";
import type { OptionView } from "srd-rules-engine";
import { Icon } from "@/components/Icon";
import { OptionButton } from "@/components/OptionButton";
import { SrdText } from "@/components/SrdText";
import { Button, cx, Reasons } from "@/components/ui";
import { VirtualList } from "@/components/VirtualList";
import type { ChoiceView } from "@/engine/facade";
import { t } from "@/i18n";

const SEARCH_FROM = 12;
const VIRTUAL_FROM = 40;

export function ChoiceCard({
  choice,
  onPick,
  past,
}: {
  choice: ChoiceView;
  /** Send new values; resolves to refusal reasons or `null`. */
  onPick: (values: readonly string[]) => Promise<readonly string[] | null>;
  past?: boolean;
}) {
  const [reasons, setReasons] = useState<readonly string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const missing = Math.max(0, choice.required - choice.selected.length);

  async function pick(values: readonly string[]) {
    setBusy(true);
    try {
      setReasons(await onPick(values));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label={choice.label}
      aria-busy={busy}
      className={cx("panel p-3", missing > 0 ? "border-gold/50" : "")}
    >
      <header className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-display text-lg font-semibold text-ink">{choice.label}</h3>
        <span className="text-sm text-ink-muted">
          {choice.fixed
            ? t("builder.fixedBy", { source: choice.source })
            : choice.replaces
              ? t("builder.replace")
              : t("builder.chosen", { chosen: choice.selected.length, count: choice.count })}
        </span>
        {!choice.fixed && missing === 0 && choice.selected.length > 0 && (
          <Icon name="check" size={16} className="text-green" />
        )}
        <span className="ml-auto text-[13px] text-ink-faint">
          {t("builder.from", { source: choice.source })}
        </span>
      </header>
      {choice.hint && <p className="mb-2 text-sm text-ink-muted">{choice.hint}</p>}
      <Reasons reasons={reasons} className="mb-2" />
      {choice.fixed ? (
        <FixedAnswer choice={choice} />
      ) : choice.replaces ? (
        <Replacement choice={choice} onPick={pick} busy={busy} />
      ) : choice.repeats ? (
        <Increases choice={choice} onPick={pick} />
      ) : (
        <Options choice={choice} onPick={pick} past={past ?? false} />
      )}
    </section>
  );
}

function nameOf(options: readonly OptionView[], id: string): string {
  return options.find((o) => o.id === id)?.name ?? id;
}

function FixedAnswer({ choice }: { choice: ChoiceView }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {(choice.fixed ?? []).map((id) => (
        <li key={id} className="plaque plaque-sm" data-on="true">
          <Icon name="lock" size={14} />
          {nameOf(choice.options, id)}
        </li>
      ))}
    </ul>
  );
}

function Options({
  choice,
  onPick,
}: {
  choice: ChoiceView;
  onPick: (values: readonly string[]) => void;
  past: boolean;
}) {
  const [query, setQuery] = useState("");
  const selected = new Set(choice.selected);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? choice.options.filter((o) => o.name.toLowerCase().includes(q)) : choice.options;
  }, [choice.options, query]);

  const toggle = (id: string) => {
    if (selected.has(id)) onPick(choice.selected.filter((v) => v !== id));
    else if (choice.count === 1) onPick([id]);
    else onPick([...choice.selected, id]);
  };

  const row = (option: OptionView) => (
    <div className="flex items-stretch gap-1 pb-1.5">
      <OptionButton
        reason={selected.has(option.id) ? null : option.unavailable}
        on={selected.has(option.id)}
        onClick={() => toggle(option.id)}
        icon={selected.has(option.id) ? "check" : undefined}
        detail={option.description ? firstLine(option.description) : undefined}
      >
        {option.name}
      </OptionButton>
      {option.description && <MoreText title={option.name} text={option.description} />}
    </div>
  );

  if (!choice.options.length)
    return <p className="text-sm text-ink-muted">{t("builder.noChoices")}</p>;
  return (
    <div>
      {choice.options.length >= SEARCH_FROM && (
        <label className="mb-2 flex items-center gap-2">
          <Icon name="search" className="text-bronze" />
          <span className="sr-only">{t("common.search")}</span>
          <input
            className="field"
            type="search"
            value={query}
            placeholder={t("common.search")}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      )}
      {choice.selected.length > 0 && choice.count > 1 && (
        <p className="mb-2 text-sm">
          {choice.selected.map((id) => nameOf(choice.options, id)).join(" · ")}
        </p>
      )}
      {visible.length >= VIRTUAL_FROM ? (
        <VirtualList
          items={visible}
          estimate={58}
          className="max-h-[28rem] pr-1"
          label={choice.label}
          getKey={(o) => o.id}
          render={row}
        />
      ) : (
        <ul
          aria-label={choice.label}
          className={cx(choice.options.length > 6 && "sm:columns-2 sm:gap-2")}
        >
          {visible.map((o) => (
            <li key={o.id} className="break-inside-avoid">
              {row(o)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function firstLine(text: string): string {
  const line = text.split("\n")[0] ?? "";
  return line.length > 90 ? `${line.slice(0, 88)}…` : line;
}

export function MoreText({ title, text }: { title: string; text: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="plaque !px-2"
          aria-label={`${t("common.details")}: ${title}`}
        >
          <Icon name="info" size={16} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="left"
          sideOffset={6}
          collisionPadding={12}
          className="prose-srd z-50 max-h-[60vh] w-[min(28rem,90vw)] overflow-y-auto rounded-md border border-line-strong bg-panel-2 p-3 text-sm shadow-panel"
        >
          <div className="mb-1 font-semibold text-gold">{title}</div>
          <SrdText text={text} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Repeatable picks: how many times each option is taken (Ability Score Improvement: +1 each). */
function Increases({
  choice,
  onPick,
}: {
  choice: ChoiceView;
  onPick: (values: readonly string[]) => void;
}) {
  const counts = new Map<string, number>();
  for (const v of choice.selected) counts.set(v, (counts.get(v) ?? 0) + 1);
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {choice.options.map((o) => {
        const n = counts.get(o.id) ?? 0;
        return (
          <li key={o.id} className="flex items-center gap-2 rounded border border-line px-2 py-1">
            <span className="flex-1">
              {o.name}
              {o.unavailable && (
                <span className="block text-[13px] text-ink-muted italic">{o.unavailable}</span>
              )}
            </span>
            <Button
              size="sm"
              icon="minus"
              iconOnly
              label={`${t("common.remove")}: ${o.name}`}
              disabled={n === 0}
              onClick={() => {
                const i = choice.selected.lastIndexOf(o.id);
                onPick(choice.selected.filter((_, j) => j !== i));
              }}
            />
            <output className="w-6 text-center tabular-nums" aria-label={`${o.name}: +${n}`}>
              +{n}
            </output>
            <Button
              size="sm"
              icon="plus"
              iconOnly
              label={`${t("common.add")}: ${o.name}`}
              onClick={() => onPick([...choice.selected, o.id])}
            />
          </li>
        );
      })}
    </ul>
  );
}

/** "Replace one…": answered `[old, new]`, or nothing to keep everything. */
function Replacement({
  choice,
  onPick,
  busy,
}: {
  choice: ChoiceView;
  onPick: (values: readonly string[]) => void;
  busy: boolean;
}) {
  const [old, setOld] = useState(choice.selected[0] ?? "");
  const [replacement, setReplacement] = useState(choice.selected[1] ?? "");
  const olds = choice.replace_old_options ?? [];
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
        {t("builder.replaceOld")}
        <select className="field" value={old} onChange={(e) => setOld(e.target.value)}>
          <option value="">—</option>
          {olds.map((o) => (
            <option key={o.id} value={o.id} disabled={o.unavailable !== null}>
              {o.name}
              {o.unavailable ? ` (${o.unavailable})` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
        {t("builder.replaceNew")}
        <select
          className="field"
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
        >
          <option value="">—</option>
          {choice.options.map((o) => (
            <option key={o.id} value={o.id} disabled={o.unavailable !== null}>
              {o.name}
              {o.unavailable ? ` (${o.unavailable})` : ""}
            </option>
          ))}
        </select>
      </label>
      <Button
        icon="check"
        disabled={busy || !old || !replacement}
        onClick={() => onPick([old, replacement])}
      >
        {t("common.apply")}
      </Button>
      <Button disabled={busy || choice.selected.length === 0} onClick={() => onPick([])}>
        {t("builder.replaceKeep")}
      </Button>
    </div>
  );
}
