/**
 * An option the engine lists, available or not. An unavailable one is never hidden: it stays in
 * place, greyed out and still focusable (`aria-disabled`), with the engine's reason word for word:
 * under the label in a list row, on hover and focus for a quick-bar tile, and always read by
 * screen readers (`aria-describedby`).
 */

import { Tooltip } from "radix-ui";
import { type ReactNode, useId } from "react";
import { Icon, type IconName } from "./Icon";
import { cx } from "./ui";

export function OptionButton({
  children,
  reason,
  onClick,
  icon,
  on,
  detail,
  className,
  variant = "row",
}: {
  children: ReactNode;
  /** Why it can't be chosen (the engine's words); `null` when it can. */
  reason: string | null;
  onClick?: () => void;
  icon?: IconName;
  on?: boolean;
  /** A second line (a cost, uses left). */
  detail?: ReactNode;
  className?: string;
  /** `row`: a full-width list entry; `tile`: a quick-bar square. */
  variant?: "row" | "tile";
}) {
  const reasonId = useId();
  const unavailable = reason !== null;
  const button = (
    <button
      type="button"
      aria-disabled={unavailable || undefined}
      aria-describedby={unavailable ? reasonId : undefined}
      aria-pressed={on === undefined ? undefined : on}
      data-on={on ? "true" : undefined}
      onClick={() => {
        if (!unavailable) onClick?.();
      }}
      className={cx(
        "plaque",
        variant === "row"
          ? "w-full !justify-start text-left"
          : "h-[5.5rem] w-[6.5rem] flex-col !justify-start overflow-hidden !gap-1 !px-1 !pt-2 text-center text-[13px] leading-tight",
        unavailable && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {icon && <Icon name={icon} size={variant === "tile" ? 22 : 18} className="flex-none" />}
      <span className={cx("min-w-0", variant === "row" && "flex-1")}>
        <span className={variant === "tile" ? "line-clamp-3 overflow-hidden" : "block"}>
          {children}
        </span>
        {detail && variant === "row" && (
          <span className="block text-[13px] text-ink-muted">{detail}</span>
        )}
        {unavailable && variant === "row" && (
          <span id={reasonId} className="block text-[13px] text-ink-muted italic">
            {reason}
          </span>
        )}
      </span>
      {unavailable && variant === "tile" && (
        <span id={reasonId} className="sr-only">
          {reason}
        </span>
      )}
    </button>
  );
  if (variant === "row" || (!unavailable && !detail)) return button;
  return (
    <Tooltip.Root delayDuration={250}>
      <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          className="z-50 max-w-xs rounded-md border border-line-strong bg-panel-2 px-3 py-2 text-sm shadow-panel"
        >
          <div className="font-semibold">{children}</div>
          {detail && <div className="text-ink-muted">{detail}</div>}
          {unavailable && (
            <div className="flex gap-1.5 text-ink">
              <Icon name="lock" size={15} className="mt-0.5 flex-none text-blood" />
              {reason}
            </div>
          )}
          <Tooltip.Arrow className="fill-line-strong" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
