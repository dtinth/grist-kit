import { allTopics, overview, sections, type HelpTopic } from "./topics.ts";

const GENERATED_NOTICE =
  "<!-- Generated from src/help/topics.ts — do not edit directly. Run `vp run docs` to regenerate. -->";

/** Topic listing shown by `grist-kit help` and appended to `grist-kit --help`. */
export function renderTopicList(): string {
  const width = Math.max(...allTopics().map((topic) => topic.id.length));
  const lines: string[] = [];
  for (const section of sections) {
    lines.push(`${section.title}:`);
    for (const topic of section.topics) {
      lines.push(`  ${topic.id.padEnd(width)}  ${topic.summary}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

/** Output of a bare `grist-kit help`. */
export function renderHelpIndex(): string {
  return [
    stripMarkdownLinks(overview),
    "",
    "Documentation topics:",
    "",
    renderTopicList(),
    "",
    "Run `grist-kit help <topic>` to read a topic, or `grist-kit help --all` to print everything.",
    "Run `grist-kit <command> --help` for command flags.",
  ].join("\n");
}

/** Output of `grist-kit help <topic>`. */
export function renderTopicPage(topic: HelpTopic): string {
  return `# ${topic.title}\n\n${topic.body.trim()}`;
}

/** Output of `grist-kit help --all`: every topic in reading order. */
export function renderAllTopics(): string {
  const parts = [stripMarkdownLinks(overview)];
  for (const topic of allTopics()) {
    parts.push(renderTopicPage(topic));
  }
  return parts.join("\n\n---\n\n");
}

/**
 * The complete docs site as file name → content. The `docs/` directory in the
 * repository is generated from this, and a test keeps it in sync.
 */
export function renderSiteFiles(): Map<string, string> {
  const files = new Map<string, string>();

  let index = `${GENERATED_NOTICE}\n\n# grist-kit\n\n${overview}\n`;
  for (const section of sections) {
    const ids = section.topics.map((topic) => topic.id).join("\n");
    index += `\n\`\`\`{toctree}\n:caption: ${section.title}\n:maxdepth: 1\n\n${ids}\n\`\`\`\n`;
  }
  files.set("index.md", index);

  for (const topic of allTopics()) {
    files.set(`${topic.id}.md`, `${GENERATED_NOTICE}\n\n${renderTopicPage(topic)}\n`);
  }
  return files;
}

/** Turns `[text](url)` into `text (url)` so terminal output has no markdown-only syntax. */
function stripMarkdownLinks(markdown: string): string {
  return markdown.replace(/\[([^\][]+)\]\(([^()]+)\)/g, "$1 ($2)");
}
