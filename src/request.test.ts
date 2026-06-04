import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test";

import { createRequester } from "./request.ts";

interface CapturedRequest {
  method: string;
  url: string;
  authorization: string | undefined;
}

let server: Server;
let baseDocUrl: string;
let captured: CapturedRequest[];

beforeEach(async () => {
  captured = [];
  server = createServer((req, res) => {
    captured.push({
      method: req.method ?? "GET",
      url: req.url ?? "",
      authorization: req.headers.authorization as string | undefined,
    });
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end("{}");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("Failed to bind test server");
  baseDocUrl = `http://127.0.0.1:${addr.port}/api/docs/abc`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("createRequester — auth wiring", () => {
  test("throws when both apiKey and accessToken are set", () => {
    expect(() => createRequester({ baseDocUrl, apiKey: "k", accessToken: "t" })).toThrow(
      /either apiKey or accessToken/,
    );
  });

  test("empty apiKey + accessToken does not throw (treated as accessToken only)", () => {
    expect(() => createRequester({ baseDocUrl, apiKey: "", accessToken: "t" })).not.toThrow();
  });

  test("apiKey: undefined + accessToken: undefined is unauthenticated", async () => {
    const r = createRequester({ baseDocUrl });
    await r.request("/tables");
    expect(captured[0]!.authorization).toBeUndefined();
    expect(captured[0]!.url).toBe("/api/docs/abc/tables");
    expect(captured[0]!.url).not.toMatch(/[?&]auth=/);
  });

  test("apiKey is sent as Authorization: Bearer header", async () => {
    const r = createRequester({ baseDocUrl, apiKey: "secret" });
    await r.request("/tables");
    expect(captured[0]!.authorization).toBe("Bearer secret");
    expect(captured[0]!.url).not.toMatch(/[?&]auth=/);
  });

  test("string accessToken is sent as ?auth= query param", async () => {
    const r = createRequester({ baseDocUrl, accessToken: "jwt-1" });
    await r.request("/tables");
    expect(captured[0]!.authorization).toBeUndefined();
    expect(captured[0]!.url).toBe("/api/docs/abc/tables?auth=jwt-1");
  });

  test("function accessToken is invoked per request and appended as ?auth=", async () => {
    let calls = 0;
    const r = createRequester({
      baseDocUrl,
      accessToken: () => {
        calls++;
        return `jwt-${calls}`;
      },
    });
    await r.request("/tables");
    await r.request("/tables");
    await r.request("/tables");
    expect(calls).toBe(3);
    expect(captured.map((c) => c.url)).toEqual([
      "/api/docs/abc/tables?auth=jwt-1",
      "/api/docs/abc/tables?auth=jwt-2",
      "/api/docs/abc/tables?auth=jwt-3",
    ]);
  });

  test("async function accessToken is awaited", async () => {
    const r = createRequester({
      baseDocUrl,
      accessToken: async () => {
        await new Promise((r) => setTimeout(r, 5));
        return "async-jwt";
      },
    });
    await r.request("/tables");
    expect(captured[0]!.url).toBe("/api/docs/abc/tables?auth=async-jwt");
  });

  test("accessToken auth wins on merge with user-supplied query", async () => {
    const r = createRequester({
      baseDocUrl,
      accessToken: "our-token",
      fetchOptions: { query: { auth: "user-token", foo: "bar" } },
    });
    await r.request("/tables");
    const url = new URL(captured[0]!.url, baseDocUrl);
    expect(url.searchParams.get("auth")).toBe("our-token");
    expect(url.searchParams.get("foo")).toBe("bar");
  });

  test("per-request user query is merged with our auth", async () => {
    const r = createRequester({ baseDocUrl, accessToken: "our-token" });
    await r.request("/tables", { query: { filter: "x=1" } });
    const url = new URL(captured[0]!.url, baseDocUrl);
    expect(url.searchParams.get("auth")).toBe("our-token");
    expect(url.searchParams.get("filter")).toBe("x=1");
  });

  test("user-supplied onRequest runs alongside ours and sees our auth on options.query", async () => {
    let userSawAuth: string | undefined;
    const r = createRequester({
      baseDocUrl,
      accessToken: "tok",
      fetchOptions: {
        onRequest({ options }) {
          userSawAuth = options.query?.auth as string | undefined;
        },
      },
    });
    await r.request("/tables");
    expect(userSawAuth).toBe("tok");
  });

  test("user-supplied onRequest array is composed with ours", async () => {
    const seen: (string | undefined)[] = [];
    const r = createRequester({
      baseDocUrl,
      accessToken: "tok",
      fetchOptions: {
        onRequest: [
          ({ options }) => {
            seen.push(options.query?.auth as string | undefined);
          },
          ({ options }) => {
            seen.push(options.query?.auth as string | undefined);
          },
        ],
      },
    });
    await r.request("/tables");
    expect(seen).toEqual(["tok", "tok"]);
  });

  test("accessToken is also applied when going through fetch.raw (attachments path)", async () => {
    const r = createRequester({ baseDocUrl, accessToken: "raw-tok" });
    await r.fetch.raw(`${baseDocUrl}/attachments/42/download`);
    expect(captured[0]!.url).toBe("/api/docs/abc/attachments/42/download?auth=raw-tok");
  });
});
