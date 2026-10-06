/**
 * SRD text as the catalog stores it: paragraphs, `_italic_` and `**bold**`, `- ` lists and HTML
 * tables. Rendered as React elements (never as HTML), so the text can't inject markup.
 */

import { Fragment, type ReactNode } from "react";
import { cx } from "./ui";

export function SrdText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cx("prose-srd space-y-2 leading-relaxed", className)}>
      {blocks(text).map((block, i) => (
        <Fragment key={i}>{block}</Fragment>
      ))}
    </div>
  );
}

function blocks(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const chunks = text
    .split(/\n\s*\n/)
    .map((c) => c.trim())
    .filter(Boolean);
  for (const chunk of chunks) {
    if (chunk.startsWith("<table")) out.push(<Table html={chunk} />);
    else if (chunk.split("\n").every((l) => /^\s*[-*] /.test(l))) {
      out.push(
        <ul className="list-disc space-y-0.5 pl-5">
          {chunk.split("\n").map((l, i) => (
            <li key={i}>{inline(l.replace(/^\s*[-*] /, ""))}</li>
          ))}
        </ul>,
      );
    } else {
      out.push(<p>{inline(chunk.replace(/\n/g, " "))}</p>);
    }
  }
  return out;
}

/** `**bold**` and `_italic_` / `*italic*`. */
export function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|_(.+?)_|\*(.+?)\*/g;
  let last = 0;
  let key = 0;
  for (let m = pattern.exec(text); m; m = pattern.exec(text)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) parts.push(<strong key={key++}>{m[1]}</strong>);
    else parts.push(<em key={key++}>{m[2] ?? m[3]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function Table({ html }: { html: string }) {
  const rows = parseTable(html);
  if (!rows) return <p>{html.replace(/<[^>]+>/g, " ")}</p>;
  const [head, ...body] = rows;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {head && (
          <thead>
            <tr>
              {head.cells.map((c, i) => (
                <th
                  key={i}
                  className="border-b border-line-strong px-2 py-1 text-left font-semibold text-gold"
                >
                  {inline(c)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {body.map((row, r) => (
            <tr key={r} className="border-b border-line">
              {row.cells.map((c, i) => (
                <td key={i} className="px-2 py-1 align-top">
                  {inline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The rows of an HTML table as text cells (first row: the header). */
function parseTable(html: string): { cells: string[] }[] | null {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => ({
    cells: [...(m[1] ?? "").matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) =>
      decode((c[1] ?? "").replace(/<[^>]+>/g, "").trim()),
    ),
  }));
  return rows.length ? rows : null;
}

function decode(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
