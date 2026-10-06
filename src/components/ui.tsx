/**
 * Shared building blocks, in the table's look: plaque buttons, gold section titles, dialogs,
 * tabs, gems for slots and uses, HP bars. Radix provides the accessible behavior.
 */

import { Dialog as RDialog, Tabs as RTabs } from "radix-ui";
import { type ButtonHTMLAttributes, forwardRef, type ReactNode, useId } from "react";
import { t } from "@/i18n";
import { Icon, type IconName } from "./Icon";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: IconName;
  variant?: "plaque" | "gold" | "danger" | "ghost";
  size?: "md" | "sm";
  /** Lit: the chosen tab, an option that's on. */
  on?: boolean;
  /** Only the icon shows; `label` is the accessible name. */
  iconOnly?: boolean;
  label?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    icon,
    variant = "plaque",
    size = "md",
    on,
    iconOnly,
    label,
    className,
    children,
    type,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      data-on={on ? "true" : undefined}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : rest.title}
      className={cx(
        variant === "ghost"
          ? "inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-ink-muted hover:text-gold-hi"
          : "plaque",
        variant === "gold" && "plaque-gold",
        variant === "danger" && "plaque-danger",
        size === "sm" && variant !== "ghost" && "plaque-sm",
        iconOnly && variant !== "ghost" && "!px-2",
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 16 : 18} />}
      {iconOnly ? null : (children ?? label)}
    </button>
  );
});

/** A card with a gold small-caps title, a diamond and a fading rule. */
export function Section({
  title,
  actions,
  children,
  className,
  bodyClassName,
  id,
}: {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cx("panel p-3", className)} id={id}>
      <div className="mb-2 flex items-center gap-2">
        <h2 id={headingId} className="section-title min-w-0 flex-1">
          {title}
        </h2>
        {actions}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4">
      <h1 className="font-display text-3xl font-semibold tracking-wide text-gold [font-variant:small-caps]">
        {children}
      </h1>
      {sub && <p className="text-ink-muted">{sub}</p>}
    </div>
  );
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <RDialog.Content
          className={cx(
            "panel rise-in fixed top-1/2 left-1/2 z-50 max-h-[88vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-5 shadow-panel",
            wide ? "max-w-3xl" : "max-w-lg",
          )}
        >
          <div className="mb-3 flex items-start gap-3">
            <RDialog.Title className="flex-1 font-display text-2xl font-semibold text-gold [font-variant:small-caps]">
              {title}
            </RDialog.Title>
            <RDialog.Close asChild>
              <Button variant="ghost" icon="x" iconOnly label={t("common.close")} />
            </RDialog.Close>
          </div>
          {description ? (
            <RDialog.Description className="mb-3 text-ink-muted">{description}</RDialog.Description>
          ) : (
            <RDialog.Description className="sr-only">{title}</RDialog.Description>
          )}
          {children}
          {footer && <div className="mt-4 flex flex-wrap justify-end gap-2">{footer}</div>}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export interface TabItem<T extends string> {
  readonly value: T;
  readonly label: ReactNode;
  readonly icon?: IconName;
  readonly content: ReactNode;
}

export function Tabs<T extends string>({
  value,
  onValueChange,
  items,
  label,
  className,
}: {
  value: T;
  onValueChange: (value: T) => void;
  items: readonly TabItem<T>[];
  label: string;
  className?: string;
}) {
  return (
    <RTabs.Root
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      className={cx("flex min-h-0 flex-col", className)}
    >
      <RTabs.List aria-label={label} className="mb-3 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <RTabs.Trigger
            key={item.value}
            value={item.value}
            className="plaque plaque-sm data-[state=active]:border-gold data-[state=active]:bg-plaque-lit data-[state=active]:text-gold-hi"
          >
            {item.icon && <Icon name={item.icon} size={16} />}
            {item.label}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {items.map((item) => (
        <RTabs.Content
          key={item.value}
          value={item.value}
          className="min-h-0 flex-1 focus-visible:outline-none"
        >
          {item.content}
        </RTabs.Content>
      ))}
    </RTabs.Root>
  );
}

/** Spell slots or uses: one gem per use, filled while available. */
export function Gems({
  total,
  spent,
  label,
  onSpend,
  onRestore,
}: {
  total: number;
  spent: number;
  label: string;
  onSpend?: () => void;
  onRestore?: () => void;
}) {
  const left = Math.max(0, total - spent);
  const description = t("common.left", { left, total });
  const gems = Array.from({ length: total }, (_, i) => (
    <span key={i} className="gem inline-block" data-spent={i >= left ? "true" : "false"} />
  ));
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex flex-wrap items-center gap-1.5"
        role="img"
        aria-label={`${label}: ${description}`}
      >
        {gems}
      </span>
      {(onSpend || onRestore) && (
        <span className="ml-auto flex gap-1">
          {onSpend && (
            <Button
              size="sm"
              icon="minus"
              iconOnly
              label={t("common.spendOne", { what: label })}
              onClick={onSpend}
              disabled={left === 0}
            />
          )}
          {onRestore && (
            <Button
              size="sm"
              icon="plus"
              iconOnly
              label={t("common.restoreOne", { what: label })}
              onClick={onRestore}
              disabled={spent === 0}
            />
          )}
        </span>
      )}
    </div>
  );
}

export function HpBar({
  hp,
  max,
  temp = 0,
  className,
}: {
  hp: number;
  max: number;
  temp?: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 0;
  const color = pct > 50 ? "bg-green" : pct > 25 ? "bg-gold" : "bg-blood";
  return (
    <div
      className={cx("relative h-1.5 overflow-hidden rounded-full bg-panel-3", className)}
      aria-hidden="true"
    >
      <div
        className={cx("h-full rounded-full transition-[width]", color)}
        style={{ width: `${pct}%` }}
      />
      {temp > 0 && <div className="absolute inset-y-0 right-0 w-1/5 bg-blue/70" />}
    </div>
  );
}

/** Reasons the engine gave for refusing what the user just did, shown where they acted. */
export function Reasons({
  reasons,
  className,
}: {
  reasons: readonly string[] | null | undefined;
  className?: string;
}) {
  if (!reasons?.length) return null;
  return (
    <div
      role="alert"
      className={cx(
        "rounded-md border border-blood/60 bg-blood-dim/40 px-3 py-2 text-sm",
        className,
      )}
    >
      <ul className="space-y-0.5">
        {reasons.map((r) => (
          <li key={r} className="flex gap-2">
            <Icon name="warning" size={16} className="mt-0.5 flex-none text-blood" />
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Empty({ children, icon }: { children: ReactNode; icon?: IconName }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-ink-muted">
      {icon && <Icon name={icon} size={28} className="text-bronze" />}
      {children}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 text-ink-muted">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      <span>{label ?? t("common.loading")}</span>
    </div>
  );
}

/** A labelled number in a box: AC, HP, Speed… */
export function StatBox({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex min-w-[4.5rem] flex-col items-center rounded-lg border border-line bg-panel-2 px-2 py-1.5",
        className,
      )}
    >
      <span className="text-[13px] tracking-wider text-ink-muted uppercase">{label}</span>
      <span className="font-display text-2xl font-bold leading-tight text-ink">{children}</span>
    </div>
  );
}
