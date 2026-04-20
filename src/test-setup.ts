import { execSync } from "node:child_process";

const CONTAINER = "grist-kit-grist";
const DEFAULT_GRIST_URL = "http://localhost:8484";

let docId: string | null = null;

function gristUrl(): string {
  return process.env.GRIST_TEST_URL ?? DEFAULT_GRIST_URL;
}

export async function setup(): Promise<void> {
  if (process.env.CI) {
    execSync(`docker rm -f ${CONTAINER}`, { stdio: "ignore" });
    execSync(
      `docker run -d --name ${CONTAINER} -p 8484:8484 ` +
        `-e GRIST_IN_SERVICE=true gristlabs/grist`,
      { stdio: "inherit" },
    );
    await waitForGrist();
  }

  docId = await createEmptyDoc();
  process.env.GRIST_TEST_DOC_URL = `${gristUrl()}/api/docs/${docId}`;
}

export async function teardown(): Promise<void> {
  if (docId) {
    await fetch(`${gristUrl()}/api/docs/${docId}`, { method: "DELETE" }).catch(() => undefined);
    docId = null;
  }
  if (process.env.CI) {
    execSync(`docker rm -f ${CONTAINER}`, { stdio: "ignore" });
  }
}

async function waitForGrist(): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${gristUrl()}/status`);
      if (response.ok) return;
    } catch {
      // not ready yet
    }
    await sleep(1000);
  }
  throw new Error(`Grist did not become ready at ${gristUrl()} within 60s`);
}

async function createEmptyDoc(): Promise<string> {
  return (await fetchJson(`${gristUrl()}/api/docs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ documentName: "grist-kit-test" }),
  })) as string;
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${init?.method ?? "GET"} ${url} -> ${response.status}`);
  }
  return response.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
