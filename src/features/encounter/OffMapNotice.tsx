/**
 * A warning while the map is in use (someone stands on it) and a combatant doesn't: without a
 * square, the engine treats distances to it as unknown, so its moves only spend movement. With
 * the encounter's `positions: "optional"` no reach, range or area is checked for it or against
 * it; with `"required"` the engine refuses what needs that distance. The GM can place it from here.
 */

import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui";
import type { CombatantView, EncounterView } from "@/engine/facade";
import { formatList, t, tn } from "@/i18n";
import { useTableUi } from "./tableUi";

export function OffMapNotice({
  view,
  actor,
  gm,
  required,
}: {
  view: EncounterView;
  actor: CombatantView;
  gm: boolean;
  /** The encounter's `positions` is `"required"`. */
  required: boolean;
}) {
  const select = useTableUi((s) => s.select);
  const setTool = useTableUi((s) => s.setTool);
  const fighting = view.combatants.filter((c) => !c.defeated && !c.dead);
  if (!fighting.some((c) => c.position)) return null;
  const off = fighting.filter((c) => !c.position && c.id !== actor.id);
  const actorOff = !actor.position;
  if (!actorOff && off.length === 0) return null;

  const place = (id: string) => {
    select(id);
    setTool("place");
  };
  return (
    <div
      role="status"
      className="panel flex flex-wrap items-center gap-x-3 gap-y-2 border-l-4 border-l-orange px-3 py-2 text-sm"
    >
      <Icon name="warning" size={18} className="flex-none text-orange" />
      <p className="min-w-0 flex-1">
        {actorOff
          ? t(required ? "table.offMapActorRequired" : "table.offMapActor", { name: actor.name })
          : tn(required ? "table.offMapOthersRequired" : "table.offMapOthers", off.length, {
              names: formatList(off.map((c) => c.name)),
            })}
      </p>
      {gm && actorOff && (
        <Button size="sm" icon="users" onClick={() => place(actor.id)}>
          {t("table.placeIt", { name: actor.name })}
        </Button>
      )}
      {gm &&
        !actorOff &&
        off.map((c) => (
          <Button key={c.id} size="sm" icon="users" onClick={() => place(c.id)}>
            {t("table.placeIt", { name: c.name })}
          </Button>
        ))}
      {!gm && actorOff && <p className="w-full text-ink-muted">{t("table.offMapAskGm")}</p>}
    </div>
  );
}
