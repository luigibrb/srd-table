/** Name & Alignment: the last step, since nothing depends on it. */

import { useEffect, useState } from "react";
import type { Alignment } from "srd-rules-engine";
import { Reasons, Section } from "@/components/ui";
import { alignments } from "@/engine/constants";
import type { BuildEdit, BuildView } from "@/engine/facade";
import { t } from "@/i18n";

export function DetailsStep({
  view,
  edit,
}: {
  view: BuildView;
  edit: (e: BuildEdit) => Promise<readonly string[] | null>;
}) {
  const [name, setName] = useState(view.build.name);
  const [reasons, setReasons] = useState<readonly string[] | null>(null);
  useEffect(() => setName(view.build.name), [view.build.name]);

  const commitName = async () => {
    if (name === view.build.name) return;
    setReasons(await edit({ type: "name", name }));
  };

  return (
    <Section title={t("builder.name")}>
      <Reasons reasons={reasons} className="mb-2" />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">{t("builder.name")}</span>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void commitName()}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commitName();
            }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">{t("builder.alignment")}</span>
          <select
            className="field"
            value={view.build.alignment ?? ""}
            onChange={async (e) => {
              if (!e.target.value) return;
              setReasons(await edit({ type: "alignment", alignment: e.target.value as Alignment }));
            }}
          >
            <option value="">—</option>
            {alignments().map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Section>
  );
}
