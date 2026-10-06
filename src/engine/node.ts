/**
 * The in-process facade over the engine package's split SRD on disk, for tests and scripts (Node
 * only: never imported by browser code).
 */

import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Rng } from "srd-rules-engine";
import { createInProcessFacade, type EngineFacade } from "./facade";

const require = createRequire(import.meta.url);
const srdDir = dirname(require.resolve("srd-rules-engine/srd-5.2.1/manifest.json"));
const packDirs: Record<string, string> = { "srd-5.2.1": srdDir };

export function nodeFacade(options: { seed?: number; rng?: Rng } = {}): EngineFacade {
  return createInProcessFacade({
    ...options,
    fetchFile: async (pack, file) => {
      const dir = packDirs[pack];
      if (!dir) throw new Error(`Unknown pack '${pack}'`);
      return JSON.parse(await readFile(join(dir, file), "utf8"));
    },
  });
}
