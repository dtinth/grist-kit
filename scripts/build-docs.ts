// Regenerates the docs/ directory (thdocs site) from src/help/topics.ts.
// Run with: vp run docs
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import { renderSiteFiles } from "../src/help/render.ts";

const docsDir = fileURLToPath(new URL("../docs", import.meta.url));
const files = renderSiteFiles();

await rm(docsDir, { recursive: true, force: true });
await mkdir(docsDir, { recursive: true });
for (const [name, content] of files) {
  await writeFile(join(docsDir, name), content, "utf8");
}

const written = await readdir(docsDir);
console.log(`Wrote ${written.length} files to docs/`);
