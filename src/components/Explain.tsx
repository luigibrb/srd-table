/**
 * A number with its explanation (`AC 17 = 16 Chain Mail + 1 Defense`), shown on hover or tap,
 * and always available to screen readers. The parts come from the engine (`Stat.parts`).
 */

import { Popover } from "radix-ui";
import type { ReactNode } from "react";
import type { Contribution } from "srd-rules-engine";
import { signed } from "@/i18n";
import { explainParts } from "@/lib/format";
import { cx } from "./ui";

export function Explain({
  label,
  total,
  parts,
  children,
  className,
  sign = false,
}: {
  label: string;
  total: number;
  parts: readonly Contribution[];
  /** What to show (default: the total). */
  children?: ReactNode;
  className?: string;
  /** Show the total as a modifier (`+3`). */
  sign?: boolean;
}) {
  const text = `${label} ${sign ? signed(total) : total} = ${explainParts(parts)}`;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={text}
          className={cx(
            "cursor-help rounded underline decoration-bronze/60 decoration-dotted underline-offset-4 hover:text-gold-hi",
            className,
          )}
        >
          {children ?? (sign ? signed(total) : total)}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={6}
          className="z-50 max-w-xs rounded-md border border-line-strong bg-panel-2 px-3 py-2 text-sm shadow-panel"
        >
          <div className="font-semibold text-gold">
            {label} {sign ? signed(total) : total}
          </div>
          <ul className="mt-1 space-y-0.5">
            {parts.map((p, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span className="text-ink-muted">{p.source}</span>
                <span className="tabular-nums">{i === 0 ? p.value : signed(p.value)}</span>
              </li>
            ))}
          </ul>
          <Popover.Arrow className="fill-line-strong" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
