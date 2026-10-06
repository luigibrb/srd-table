/** The combat log: the engine's notes for each action, newest at the bottom. */

import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";
import { Button, cx, Section } from "@/components/ui";
import { t } from "@/i18n";
import type { LogEntry } from "@/store/documents";

export function CombatLog({
  log,
  onClear,
  className,
}: {
  log: readonly LogEntry[];
  onClear?: () => void;
  className?: string;
}) {
  const end = useRef<HTMLLIElement>(null);
  const last = log.at(-1)?.id;
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when a new entry arrives
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [last]);
  return (
    <Section
      title={t("table.log")}
      className={cx("flex min-h-0 flex-col", className)}
      bodyClassName="min-h-0 flex-1 overflow-y-auto"
      actions={
        onClear && log.length > 0 ? (
          <Button
            size="sm"
            variant="ghost"
            icon="trash"
            iconOnly
            label={t("table.clearLog")}
            onClick={onClear}
          />
        ) : null
      }
    >
      {log.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("table.logEmpty")}</p>
      ) : (
        <ol aria-live="polite" className="space-y-1.5 text-sm">
          {log.map((entry) => (
            <li
              key={entry.id}
              className={cx(
                "rounded border-l-2 py-0.5 pl-2",
                entry.tone === "decision"
                  ? "border-gold bg-plaque-lit/40"
                  : entry.tone === "refusal"
                    ? "border-blood"
                    : "border-line-strong",
              )}
            >
              {entry.round > 0 && (
                <span className="mr-1 text-[13px] text-ink-faint">
                  {t("encounters.round", { round: entry.round })}
                </span>
              )}
              {entry.tone === "decision" && (
                <Icon name="hourglass" size={14} className="mr-1 inline text-gold" />
              )}
              {entry.lines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </li>
          ))}
          <li ref={end} aria-hidden="true" />
        </ol>
      )}
    </Section>
  );
}
