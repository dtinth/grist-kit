# grist-kit

A CLI and type-safe client library for [Grist](https://www.getgrist.com), written in TypeScript. It provides:

- An agent-friendly CLI for interacting with Grist documents.
- A command-line tool to generate type definitions from a Grist table schema.
- A type-safe client for programmatically querying and manipulating Grist documents.

**Status:** Pre-release. API unstable.

## Install

```bash
npm install grist-kit
```

## Documentation

Documentation ships with the CLI itself, so it is always available offline and matches the installed version — handy for both humans and AI agents:

```bash
npx grist-kit help            # list documentation topics
npx grist-kit help quickstart # read a topic
npx grist-kit help --all      # print everything
```

The [docs site](https://docs.dt.in.th/grist-kit/) is generated from the same content (see `src/help/topics.ts`).
