/**
 * File export and import: the documents' own JSON, named like the srd-rules CLI's files
 * (`aerin.json` for a build, `aerin.state.json` for its play state), so each can open the other's.
 */

export function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ReadFile {
  readonly name: string;
  readonly data: unknown;
}

/** Read JSON files; a file that isn't JSON is reported by name. */
export async function readJsonFiles(
  files: Iterable<File>,
): Promise<{ files: ReadFile[]; bad: string[] }> {
  const read: ReadFile[] = [];
  const bad: string[] = [];
  for (const file of files) {
    try {
      read.push({ name: file.name, data: JSON.parse(await file.text()) });
    } catch {
      bad.push(file.name);
    }
  }
  return { files: read, bad };
}

/** `aerin.state.json` is a play state (the CLI's convention); anything else a build. */
export function isStateFile(name: string): boolean {
  return /\.state\.json$/i.test(name);
}

/** Pair builds with their states by base name: `aerin.json` + `aerin.state.json`. */
export function pairCharacterFiles(
  files: readonly ReadFile[],
): { build: ReadFile; state: ReadFile | null }[] {
  const base = (name: string) => name.replace(/(\.state)?\.json$/i, "").toLowerCase();
  const states = new Map(files.filter((f) => isStateFile(f.name)).map((f) => [base(f.name), f]));
  return files
    .filter((f) => !isStateFile(f.name))
    .map((build) => ({ build, state: states.get(base(build.name)) ?? null }));
}
