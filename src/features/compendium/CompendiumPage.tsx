/**
 * The Compendium: browse the catalog's tables with their SRD text, in three columns (tables, a
 * searchable list, the entry). Search is client-side over the loaded table; long lists are
 * virtualized. The selection lives in the URL.
 */

import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import type { TableName } from "srd-rules-engine";
import { Icon } from "@/components/Icon";
import { cx, Empty, Spinner } from "@/components/ui";
import { VirtualList } from "@/components/VirtualList";
import { t, tn } from "@/i18n";
import { useTable } from "@/queries";
import type { CompendiumSearch } from "@/routes/router";
import { EntryView } from "./EntryView";
import { COMPENDIUM_TABLES } from "./tables";

export interface CatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly source: string;
  readonly [key: string]: unknown;
}

export function CompendiumPage({ search }: { search: CompendiumSearch }) {
  const navigate = useNavigate();
  const table: TableName = search.table ?? "spells";
  const { data, isLoading } = useTable<CatalogEntry>(table);
  const query = search.q ?? "";
  const go = (next: CompendiumSearch) =>
    void navigate({ to: "/compendium", search: next, replace: true });

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...(data ?? [])]
      .filter((e) => !q || e.name.toLowerCase().includes(q) || e.id.includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, query]);
  const entry = search.id ? (data?.find((e) => e.id === search.id) ?? null) : null;
  const label = t(`compendium.table.${table}` as const);

  return (
    <div className="grid h-full min-h-0 gap-3 p-3 md:grid-cols-[200px_minmax(16rem,22rem)_minmax(0,1fr)]">
      <nav aria-label={t("compendium.tables")} className="panel min-h-0 overflow-y-auto p-2">
        <h1 className="section-title mb-2 px-1">{t("compendium.title")}</h1>
        <ul className="flex gap-1 overflow-x-auto md:flex-col">
          {COMPENDIUM_TABLES.map((name) => (
            <li key={name} className="flex-none">
              <button
                type="button"
                aria-current={name === table ? "page" : undefined}
                onClick={() => go({ table: name })}
                className={cx(
                  "w-full rounded px-2 py-1.5 text-left whitespace-nowrap hover:bg-card-2",
                  name === table && "bg-hl text-hl-ink",
                )}
              >
                {t(`compendium.table.${name}` as const)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <section
        aria-label={label}
        className={cx("panel flex min-h-0 flex-col p-2", entry && "hidden md:flex")}
      >
        <label className="mb-2 flex items-center gap-2">
          <Icon name="search" className="text-ink-muted" />
          <span className="sr-only">{t("compendium.search", { table: label })}</span>
          <input
            className="field"
            type="search"
            placeholder={t("compendium.search", { table: label })}
            value={query}
            onChange={(e) =>
              go({
                table,
                ...(search.id ? { id: search.id } : {}),
                ...(e.target.value ? { q: e.target.value } : {}),
              })
            }
          />
        </label>
        <p className="mb-1 px-1 text-[13px] text-ink-muted">
          {tn("compendium.count", list.length)}
        </p>
        {isLoading ? (
          <Spinner />
        ) : (
          <VirtualList
            items={list}
            estimate={40}
            className="min-h-[20rem] flex-1"
            label={label}
            getKey={(e) => e.id}
            render={(e) => (
              <button
                type="button"
                aria-current={e.id === search.id ? "true" : undefined}
                onClick={() => go({ table, id: e.id, ...(query ? { q: query } : {}) })}
                className={cx(
                  "flex w-full items-baseline gap-2 border-b border-edge/60 px-2 py-2 text-left hover:bg-card-2",
                  e.id === search.id && "bg-hl text-hl-ink",
                )}
              >
                <span className="flex-1">{e.name}</span>
                <span className="text-[13px] text-ink-faint">{subtitle(table, e)}</span>
              </button>
            )}
          />
        )}
      </section>

      <article className={cx("panel min-h-0 overflow-y-auto p-4", !entry && "hidden md:block")}>
        {entry ? (
          <>
            <button
              type="button"
              className="mb-2 text-sm text-blue underline md:hidden"
              onClick={() => go({ table, ...(query ? { q: query } : {}) })}
            >
              ‹ {label}
            </button>
            <EntryView table={table} entry={entry} />
          </>
        ) : (
          <Empty icon="book">{t("compendium.pick")}</Empty>
        )}
      </article>
    </div>
  );
}

/** A short line next to the name: a spell's level, a monster's CR, an item's rarity. */
function subtitle(table: TableName, e: CatalogEntry): string {
  if (table === "spells")
    return e.level === 0 ? t("sheet.cantrips") : t("sheet.spellLevel", { level: String(e.level) });
  if (table === "monsters") return `CR ${String(e.cr)}`;
  if (table === "magic_items") return String(e.rarity ?? "");
  if (table === "subclasses") return String(e.class ?? "");
  return "";
}
