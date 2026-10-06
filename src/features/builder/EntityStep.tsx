/** Class, Species and Background: pick one entity from its catalog table. */

import { useState } from "react";
import type { BackgroundDef, ClassDef, SpeciesDef } from "srd-rules-engine";
import { OptionButton } from "@/components/OptionButton";
import { Reasons, Spinner } from "@/components/ui";
import { abilityName } from "@/engine/constants";
import { formatList } from "@/i18n";
import { useTable } from "@/queries";
import { MoreText } from "./ChoiceCard";

type Entity = ClassDef | SpeciesDef | BackgroundDef;

export function EntityStep({
  table,
  selected,
  label,
  onPick,
}: {
  table: "classes" | "species" | "backgrounds";
  selected: string | null;
  label: string;
  onPick: (id: string) => Promise<readonly string[] | null>;
}) {
  const { data, isLoading } = useTable<Entity>(table);
  const [reasons, setReasons] = useState<readonly string[] | null>(null);
  if (isLoading || !data) return <Spinner />;
  const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div>
      <Reasons reasons={reasons} className="mb-2" />
      <ul aria-label={label} className="grid gap-2 sm:grid-cols-2">
        {sorted.map((e) => (
          <li key={e.id} className="flex items-stretch gap-1">
            <OptionButton
              reason={null}
              on={selected === e.id}
              icon={selected === e.id ? "check" : undefined}
              onClick={async () => setReasons(await onPick(e.id))}
              detail={summary(e)}
            >
              <span className="font-semibold">{e.name}</span>
            </OptionButton>
            {e.description && <MoreText title={e.name} text={e.description} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The entity's own data, as listed in the catalog (hit die, primary abilities…). */
function summary(e: Entity): string {
  if ("hit_die" in e) {
    const primary = formatList(
      e.primary_abilities.map((a) => abilityName(a)),
      e.primary_mode === "all" ? "conjunction" : "disjunction",
    );
    return `d${e.hit_die} · ${primary}`;
  }
  if ("ability_scores" in e) {
    return formatList(e.ability_scores.map((a) => abilityName(a)));
  }
  return e.creature_type ?? e.description.split("\n")[0] ?? "";
}
