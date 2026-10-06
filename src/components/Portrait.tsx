/** A character's portrait (uploaded by the player), or a medallion with initials. */

import { useEffect, useRef } from "react";
import { t } from "@/i18n";
import { usePortraits } from "@/store/portraits";
import { Button, cx } from "./ui";

export function Portrait({
  id,
  name,
  size = 64,
  round = false,
  className,
}: {
  id: string | null;
  name: string;
  size?: number;
  round?: boolean;
  className?: string;
}) {
  const url = usePortraits((s) => (id ? s.urls[id] : null));
  const load = usePortraits((s) => s.load);
  useEffect(() => {
    if (id) void load(id);
  }, [id, load]);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div
      className={cx(
        "flex flex-none items-center justify-center overflow-hidden border border-bronze bg-panel-3 font-logo text-gold",
        round ? "rounded-full" : "rounded-lg",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-hidden="true"
    >
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : initials || "?"}
    </div>
  );
}

export function PortraitPicker({ id, name }: { id: string; name: string }) {
  const input = useRef<HTMLInputElement>(null);
  const setPortrait = usePortraits((s) => s.set);
  const remove = usePortraits((s) => s.remove);
  const has = usePortraits((s) => Boolean(s.urls[id]));
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Portrait id={id} name={name} size={96} />
      <div className="flex gap-1">
        <Button
          size="sm"
          icon="portrait"
          iconOnly
          label={t("sheet.setPortrait")}
          onClick={() => input.current?.click()}
        />
        {has && (
          <Button
            size="sm"
            icon="x"
            iconOnly
            label={t("sheet.removePortrait")}
            onClick={() => void remove(id)}
          />
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        aria-label={t("sheet.setPortrait")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void setPortrait(id, file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
