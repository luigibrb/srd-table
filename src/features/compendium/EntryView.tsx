/** One catalog entry with its SRD text: spells, stat blocks, items, classes and the rest. */

import type { ReactNode } from "react";
import type {
  ArmorDef,
  ClassDef,
  MagicItemDef,
  MonsterAction,
  MonsterDef,
  SpellDef,
  TableName,
  WeaponDef,
} from "srd-rules-engine";
import { SrdText } from "@/components/SrdText";
import { abilities, abilityName } from "@/engine/constants";
import { formatList, signed, t } from "@/i18n";
import { titleCase } from "@/lib/format";
import { useModifiers } from "@/queries";
import type { CatalogEntry } from "./CompendiumPage";

export function EntryView({ table, entry }: { table: TableName; entry: CatalogEntry }) {
  return (
    <div className="space-y-3">
      <header>
        <h2 className="font-display text-3xl font-semibold text-gold [font-variant:small-caps]">
          {entry.name}
        </h2>
        <p className="text-[13px] text-ink-faint">
          {t("compendium.source", { source: entry.source })}
        </p>
      </header>
      {table === "spells" && <Spell spell={entry as unknown as SpellDef} />}
      {table === "monsters" && <StatBlock monster={entry as unknown as MonsterDef} />}
      {table === "magic_items" && <MagicItem item={entry as unknown as MagicItemDef} />}
      {table === "weapons" && <Weapon weapon={entry as unknown as WeaponDef} />}
      {table === "armor" && <Armor armor={entry as unknown as ArmorDef} />}
      {table === "classes" && <ClassEntry cls={entry as unknown as ClassDef} />}
      {table !== "monsters" && table !== "classes" && entry.description && (
        <SrdText text={entry.description} />
      )}
      {table !== "classes" && <Traits entry={entry} />}
    </div>
  );
}

function Facts({ items }: { items: readonly [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-muted">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Spell({ spell }: { spell: SpellDef }) {
  return (
    <>
      <p className="italic text-ink-muted">
        {spell.level === 0
          ? `${titleCase(spell.school)} ${t("sheet.cantrips")}`
          : `${t("sheet.spellLevel", { level: spell.level })} ${titleCase(spell.school)}`}
        {spell.ritual && ` · ${t("sheet.ritual")}`}
        {` (${spell.lists.map(titleCase).join(", ")})`}
      </p>
      <Facts
        items={[
          [t("compendium.f.castingTime"), spell.casting_time],
          [t("compendium.f.range"), spell.range],
          [t("compendium.f.components"), spell.components],
          [t("compendium.f.duration"), spell.duration],
        ]}
      />
    </>
  );
}

function MagicItem({ item }: { item: MagicItemDef }) {
  return (
    <p className="italic text-ink-muted">
      {titleCase(item.category)}, {titleCase(item.rarity)}
      {item.attunement &&
        ` (${t("compendium.attunement")}${item.attunement_by ? ` ${item.attunement_by}` : ""})`}
    </p>
  );
}

function Weapon({ weapon }: { weapon: WeaponDef }) {
  return (
    <Facts
      items={[
        [t("compendium.f.category"), `${titleCase(weapon.category)} ${titleCase(weapon.kind)}`],
        [t("compendium.f.damage"), `${weapon.damage} ${weapon.damage_type}`],
        [t("compendium.f.properties"), weapon.properties.map(titleCase).join(", ") || "—"],
        [t("compendium.f.mastery"), weapon.mastery ? titleCase(weapon.mastery) : "—"],
        [t("compendium.f.weight"), weapon.weight !== null ? `${weapon.weight} lb` : "—"],
        [t("compendium.f.cost"), weapon.cost ?? "—"],
      ]}
    />
  );
}

function Armor({ armor }: { armor: ArmorDef }) {
  return (
    <Facts
      items={[
        [t("compendium.f.category"), titleCase(armor.category)],
        [
          t("compendium.f.armorClass"),
          `${armor.base_ac}${armor.dex_cap === null ? " + Dex" : armor.dex_cap > 0 ? ` + Dex (max ${armor.dex_cap})` : ""}`,
        ],
        [t("compendium.f.strength"), armor.strength ? String(armor.strength) : "—"],
        [t("compendium.f.stealth"), armor.stealth_disadvantage ? t("dice.disadvantage") : "—"],
        [t("compendium.f.weight"), armor.weight !== null ? `${armor.weight} lb` : "—"],
        [t("compendium.f.cost"), armor.cost ?? "—"],
      ]}
    />
  );
}

function ClassEntry({ cls }: { cls: ClassDef }) {
  const levels = Object.entries(cls.features).sort(([a], [b]) => Number(a) - Number(b));
  return (
    <>
      <Facts
        items={[
          [t("compendium.f.hitDie"), `d${cls.hit_die}`],
          [
            "Primary",
            formatList(
              cls.primary_abilities.map((a) => abilityName(a)),
              cls.primary_mode === "all" ? "conjunction" : "disjunction",
            ),
          ],
          [t("compendium.f.subclass"), t("common.level", { level: cls.subclass_level })],
        ]}
      />
      {cls.description && <SrdText text={cls.description} />}
      {levels.map(([level, grants]) =>
        grants.traits.length ? (
          <section key={level}>
            <h3 className="section-title text-base">{t("common.level", { level })}</h3>
            {grants.traits.map((tr) => (
              <div key={tr.name} className="mb-2">
                <h4 className="font-semibold">{tr.name}</h4>
                <SrdText text={tr.text} className="text-sm" />
              </div>
            ))}
          </section>
        ) : null,
      )}
    </>
  );
}

/** Traits an entity grants (species, feats, backgrounds…), when it has any. */
function Traits({ entry }: { entry: CatalogEntry }) {
  const grants = entry.grants as { traits?: readonly { name: string; text: string }[] } | undefined;
  if (!grants?.traits?.length) return null;
  return (
    <div className="space-y-2">
      {grants.traits.map((tr) => (
        <div key={tr.name}>
          <h3 className="font-semibold">{tr.name}</h3>
          <SrdText text={tr.text} className="text-sm" />
        </div>
      ))}
    </div>
  );
}

function StatBlock({ monster: m }: { monster: MonsterDef }) {
  const { data: mods } = useModifiers(m.abilities as Readonly<Record<string, number>>);
  const speed = Object.entries(m.speed)
    .map(([kind, feet]) => (kind === "walk" ? `${feet} ft.` : `${titleCase(kind)} ${feet} ft.`))
    .join(", ");
  const sections: [string, readonly MonsterAction[]][] = [
    [t("compendium.f.traits"), m.traits],
    [t("compendium.f.actions"), m.actions],
    [t("compendium.f.bonusActions"), m.bonus_actions],
    [t("compendium.f.reactions"), m.reactions],
    [t("compendium.f.legendaryActions"), m.legendary_actions],
  ];
  return (
    <div className="space-y-3 rounded-lg border border-bronze/60 bg-panel-2 p-3">
      <p className="italic text-ink-muted">
        {m.size} {m.creature_type}, {m.alignment}
      </p>
      <Facts
        items={[
          [t("compendium.f.ac"), m.armor_class],
          [t("compendium.f.hp"), `${m.hit_points} (${m.hit_dice})`],
          [t("compendium.f.speed"), speed],
          [t("compendium.f.initiative"), signed(m.initiative)],
        ]}
      />
      <table className="w-full text-center text-sm">
        <thead>
          <tr>
            {abilities().map((a) => (
              <th key={a} className="font-semibold text-gold uppercase">
                {a}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {abilities().map((a) => (
              <td key={a}>
                {m.abilities[a]}{" "}
                {mods?.[a] !== undefined && (
                  <span className="text-ink-muted">({signed(mods[a] ?? 0)})</span>
                )}
              </td>
            ))}
          </tr>
          <tr className="text-[13px] text-ink-muted">
            {abilities().map((a) => (
              <td key={a}>
                {t("sheet.saves")} {signed(m.saving_throws[a] ?? mods?.[a] ?? 0)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <Facts
        items={[
          ...(Object.keys(m.skills).length
            ? ([
                [
                  t("compendium.f.skills"),
                  Object.entries(m.skills)
                    .map(([k, v]) => `${titleCase(k)} ${signed(v)}`)
                    .join(", "),
                ],
              ] as [string, string][])
            : []),
          ...(m.resistances.length
            ? ([[t("compendium.f.resistances"), m.resistances.map(titleCase).join(", ")]] as [
                string,
                string,
              ][])
            : []),
          ...(m.vulnerabilities.length
            ? ([
                [t("compendium.f.vulnerabilities"), m.vulnerabilities.map(titleCase).join(", ")],
              ] as [string, string][])
            : []),
          ...(m.immunities.length || m.condition_immunities.length
            ? ([
                [
                  t("compendium.f.immunities"),
                  [...m.immunities, ...m.condition_immunities].map(titleCase).join(", "),
                ],
              ] as [string, string][])
            : []),
          [t("compendium.f.senses"), m.senses],
          [t("compendium.f.languages"), m.languages || "—"],
          [t("compendium.f.cr"), `${m.cr} (XP ${m.xp}; PB ${signed(m.proficiency_bonus)})`],
        ]}
      />
      {sections.map(([title, list]) =>
        list.length ? (
          <section key={title}>
            <h3 className="section-title text-base">{title}</h3>
            {title === t("compendium.f.legendaryActions") && m.legendary_text && (
              <SrdText text={m.legendary_text} className="mb-2 text-sm" />
            )}
            {list.map((a) => (
              <div key={a.name} className="mb-2 text-sm">
                <SrdText text={`**${a.name}.** ${a.text}`} />
              </div>
            ))}
          </section>
        ) : null,
      )}
      {m.description && <SrdText text={m.description} className="text-sm" />}
    </div>
  );
}
