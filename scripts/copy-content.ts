/**
 * Copy the engine's split SRD (`srd-rules-engine/dist/srd-5.2.1/`: `manifest.json` + one JSON
 * file per table) to `public/content/srd-5.2.1/`, where the engine worker fetches it. Run by
 * `predev` and `prebuild`; the output is git-ignored.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PACK = "srd-5.2.1";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

// Resolve through the package `exports` so a pinned version later works the same as the symlink.
const manifest = require.resolve(`srd-rules-engine/${PACK}/manifest.json`);
const source = dirname(manifest);
const target = join(root, "public", "content", PACK);

if (!existsSync(manifest)) {
  console.error(`No split SRD at ${source}: run \`npm run build\` in srd-rules-engine.`);
  process.exit(1);
}

// Update in place (a running dev server keeps serving the folder), removing stale files.
mkdirSync(target, { recursive: true });
const files = readdirSync(source).filter((f) => f.endsWith(".json"));
for (const file of files) cpSync(join(source, file), join(target, file));
for (const file of readdirSync(target)) {
  if (!files.includes(file)) rmSync(join(target, file), { force: true });
}
console.log(`Copied ${files.length} files of ${PACK} to public/content/${PACK}/`);
