import type { TableName } from "srd-rules-engine";

/** The catalog tables the Compendium browses, in menu order. */
export const COMPENDIUM_TABLES = [
  "classes",
  "subclasses",
  "species",
  "backgrounds",
  "feats",
  "features",
  "spells",
  "weapons",
  "armor",
  "gear",
  "tools",
  "magic_items",
  "monsters",
  "conditions",
  "masteries",
  "languages",
] as const satisfies readonly TableName[];
