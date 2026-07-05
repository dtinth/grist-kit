import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";

import { allTopics } from "./topics.ts";
import { renderSiteFiles } from "./render.ts";

const docsDir = fileURLToPath(new URL("../../docs", import.meta.url));

describe("help topics", () => {
  it("have unique ids", () => {
    const ids = allTopics().map((topic) => topic.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("docs/ directory", () => {
  it("is in sync with src/help/topics.ts (run `vp run docs` to fix)", async () => {
    const expected = renderSiteFiles();
    const actual = (await readdir(docsDir)).sort();
    expect(actual).toEqual([...expected.keys()].sort());
    for (const [name, content] of expected) {
      expect(await readFile(join(docsDir, name), "utf8"), name).toBe(content);
    }
  });
});
