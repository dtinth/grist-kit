---
grist-kit: minor
---

Ship documentation with the CLI. A new `grist-kit help [topic]` command lists and prints documentation topics (quickstart, configuration, per-command guides, client library guides, and the full tutorial), making the docs discoverable offline and by AI agents. `grist-kit --help` and per-command `--help` now point to the relevant topics. The docs site is now generated from the same in-source content (`src/help/topics.ts`) via `vp run docs`, with a test that keeps `docs/` in sync.
