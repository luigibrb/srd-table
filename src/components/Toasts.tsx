/**
 * Notes from setters and play actions, and app messages, as toasts in the bottom-left corner (the
 * dice tray has the bottom-right one), away from the stats at the top of the sheet.
 */

import { useEffect } from "react";
import { t } from "@/i18n";
import { type Toast, useUi } from "@/store/ui";
import { Icon } from "./Icon";
import { Button, cx } from "./ui";

const SHOW_MS = 9000;

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  return (
    <section
      aria-label={t("toasts.region")}
      aria-live="polite"
      className="pointer-events-none fixed bottom-10 left-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col-reverse gap-2"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </section>
  );
}

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useUi((s) => s.dismissToast);
  useEffect(() => {
    if (toast.tone === "error") return;
    const timer = setTimeout(() => dismiss(toast.id), SHOW_MS);
    return () => clearTimeout(timer);
  }, [dismiss, toast.id, toast.tone]);
  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className={cx(
        "panel rise-in pointer-events-auto flex gap-2 p-3 shadow-panel",
        toast.tone === "error" && "border-red",
        toast.tone === "warning" && "border-orange",
      )}
    >
      <Icon
        name={toast.tone === "info" ? "info" : "warning"}
        className={cx(
          "mt-0.5 flex-none",
          toast.tone === "error"
            ? "text-red"
            : toast.tone === "warning"
              ? "text-orange"
              : "text-ink-muted",
        )}
      />
      <div className="min-w-0 flex-1 text-sm">
        {toast.title && <div className="font-semibold">{toast.title}</div>}
        <ul className="space-y-0.5">
          {toast.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
      <Button
        variant="ghost"
        icon="x"
        iconOnly
        label={t("common.dismiss")}
        onClick={() => dismiss(toast.id)}
      />
    </div>
  );
}
