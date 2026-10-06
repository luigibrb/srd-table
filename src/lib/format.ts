/** Small formatting helpers: presentation only, no rules. */

import type { Contribution } from "srd-rules-engine";
import { signed } from "@/i18n";

/** `16 Chain Mail + 1 Defense` from a stat's parts, as given. */
export function explainParts(parts: readonly Contribution[]): string {
  return parts
    .map((p, i) =>
      i === 0
        ? `${p.value} ${p.source}`
        : `${p.value >= 0 ? "+" : "−"} ${Math.abs(p.value)} ${p.source}`,
    )
    .join(" ");
}

export { signed };

/** `fighter` → `Fighter`, `sleight-of-hand` → `Sleight Of Hand` for ids with no name at hand. */
export function titleCase(id: string): string {
  return id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

/** A file name from a character's name: `Aerin the Bold` → `aerin-the-bold`. */
export function fileSlug(name: string, fallback: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || fallback;
}

/** Split SRD text into paragraphs. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
