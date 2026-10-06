/**
 * Content packs loaded by table. The worker keeps one catalog and rebuilds it with more tables
 * when an operation needs them: a catalog without a table throws `ContentError` on any read, so a
 * missing table is never a silent `undefined`.
 */

import {
  type Catalog,
  CORE_TABLES,
  ContentError,
  type ContentPack,
  createCatalog,
  loadPack,
  TABLE_NAMES,
  type TableName,
} from "srd-rules-engine";

/** Fetch a pack's file (`manifest.json`, `classes.json`) as parsed JSON. */
export type FetchPackFile = (pack: string, file: string) => Promise<unknown>;

/**
 * What each kind of screen needs, in the order an operation escalates when it reads a table that
 * isn't loaded: a builder starts with the core tables and adds spells for a caster; play adds magic
 * items; encounters add monsters.
 */
export const TIERS = {
  builder: [CORE_TABLES, [...CORE_TABLES, "spells"], TABLE_NAMES],
  play: [[...CORE_TABLES, "spells", "magic_items"], TABLE_NAMES],
  encounter: [TABLE_NAMES],
} as const satisfies Record<string, readonly (readonly TableName[])[]>;
export type Tier = keyof typeof TIERS;

export interface ContentSettings {
  /** Pack ids, in load order (the SRD first). Each is served at `content/<id>/`. */
  readonly packs: readonly string[];
  /** Sources a campaign allows (`null`: every source of the loaded packs). */
  readonly sources: readonly string[] | null;
}

export const DEFAULT_CONTENT: ContentSettings = { packs: ["srd-5.2.1"], sources: null };

export class ContentLoader {
  private settings: ContentSettings = DEFAULT_CONTENT;
  private readonly files = new Map<string, Promise<unknown>>();
  private loaded: { tables: Set<TableName>; catalog: Catalog } | null = null;
  private pending: Promise<Catalog> | null = null;

  constructor(private readonly fetchFile: FetchPackFile) {}

  configure(settings: ContentSettings): void {
    this.settings = settings;
    this.loaded = null;
    this.pending = null;
  }

  /** A catalog with at least these tables (rebuilt with the union of what's loaded and them). */
  async catalog(tables: readonly TableName[]): Promise<Catalog> {
    for (;;) {
      const current = this.loaded;
      if (current && tables.every((t) => current.tables.has(t))) return current.catalog;
      if (this.pending) {
        await this.pending;
        continue;
      }
      const wanted = new Set<TableName>([...(current?.tables ?? []), ...tables]);
      this.pending = this.build([...wanted]);
      try {
        const catalog = await this.pending;
        this.loaded = { tables: wanted, catalog };
        return catalog;
      } finally {
        this.pending = null;
      }
    }
  }

  /**
   * Run `fn` against a catalog of the tier's first table set; if it reads a table that isn't
   * loaded (`ContentError`), run it again with the tier's next, larger set.
   */
  async run<T>(tier: Tier, fn: (catalog: Catalog) => T): Promise<T> {
    const sets = TIERS[tier];
    for (const [i, tables] of sets.entries()) {
      const catalog = await this.catalog(tables);
      try {
        return fn(catalog);
      } catch (error) {
        if (!(error instanceof ContentError) || i === sets.length - 1) throw error;
      }
    }
    throw new Error("unreachable");
  }

  private async build(tables: readonly TableName[]): Promise<Catalog> {
    const packs: ContentPack[] = await Promise.all(
      this.settings.packs.map((id) => loadPack((file) => this.file(id, file), { tables })),
    );
    const sources = this.settings.sources ?? undefined;
    return createCatalog(packs, { tables, ...(sources ? { sources } : {}) });
  }

  /** Each file is fetched once; a failed fetch is forgotten so it can be retried. */
  private file(pack: string, file: string): Promise<unknown> {
    const key = `${pack}/${file}`;
    let promise = this.files.get(key);
    if (!promise) {
      promise = this.fetchFile(pack, file).catch((error: unknown) => {
        this.files.delete(key);
        throw error;
      });
      this.files.set(key, promise);
    }
    return promise;
  }
}

/** The browser's loader: packs served as static files under `<base>content/<pack>/`. */
export function fetchFromServer(base: string): FetchPackFile {
  return async (pack, file) => {
    const response = await fetch(`${base}content/${pack}/${file}`);
    if (!response.ok) {
      throw new ContentError(`Couldn't load ${pack}/${file} (HTTP ${response.status})`);
    }
    return response.json();
  };
}
