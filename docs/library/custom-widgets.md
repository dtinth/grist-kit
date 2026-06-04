# Custom Widgets

Grist custom widgets run inside an iframe and have access to the Grist Plugin API. The Plugin API can mint short-lived **access tokens** that the widget (or a backend it calls) can use with grist-kit to make REST API calls against the host document. This page shows the two common patterns.

For background on what an access token is, how it differs from an API key, and the security implications, see [Authentication](authentication).

## In-widget: call Grist from the widget itself

```ts
import { gristDoc } from "grist-kit";

declare const grist: {
  ready: () => Promise<void>;
  docApi: {
    getAccessToken: (options?: { readOnly?: boolean }) => Promise<{
      token: string;
      baseUrl: string;
      ttlMsecs: number;
    }>;
  };
};

await grist.ready();
const tokenInfo = await grist.docApi.getAccessToken({ readOnly: false });

let cached: { token: string; expiresAt: number } | null = null;

const doc = gristDoc({
  baseDocUrl: tokenInfo.baseUrl,
  accessToken: async () => {
    if (cached && Date.now() < cached.expiresAt - 30_000) return cached.token;
    const fresh = await grist.docApi.getAccessToken({ readOnly: false });
    cached = { token: fresh.token, expiresAt: Date.now() + fresh.ttlMsecs };
    return fresh.token;
  },
});

const rows = await doc.table("People").list();
```

A few notes:

- The `baseUrl` from `getAccessToken()` already points at the right document — use it as-is, don't hardcode a doc URL.
- The function form is invoked per HTTP request. Cache the token and only refresh when it's about to expire (the 30-second safety margin avoids races at the boundary).
- Pass `readOnly: true` if the widget does not need to write — the resulting token is restricted accordingly.
- Access tokens only grant access to document _content_ endpoints (tables, cells, attachments). They do not work for workspace, ACL, or doc-metadata operations.

## Widget → backend → Grist

Sometimes the widget is thin and most of the logic lives in a backend that the widget calls. The widget forwards the access token (and the base URL) to the backend, and the backend uses grist-kit to make Grist calls as the user.

```ts
// Widget side
const { token, baseUrl } = await grist.docApi.getAccessToken({ readOnly: false });
await fetch("https://my-backend.example.com/apply-changes", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ token, baseUrl, changes }),
});
```

```ts
// Backend side
import { gristDoc } from "grist-kit";

app.post("/apply-changes", async (req, res) => {
  const { token, baseUrl, changes } = req.body;

  const doc = gristDoc({
    baseDocUrl,
    accessToken: () => token, // closure over this request's token
  });

  try {
    await doc.request("/apply", { method: "POST", body: changes });
    res.json({ ok: true });
  } catch (error) {
    if (error.status === 401) return res.status(401).json({ error: "unauthorized" });
    throw error;
  }
});
```

Things to get right on this path:

- **Do not log the token.** Redact `?auth=` (and any incoming `token` field) in your logs. See the [Authentication checklist](authentication#security-checklist).
- **Use HTTPS on both hops.** Widget → backend and backend → Grist. Tokens are bearer credentials.
- **Map Grist's `401` to a `401` response** to the widget, not a `500`. The token has expired or is invalid; the widget should refresh and retry.
- **Build the requester per incoming request.** A long-lived `gristDoc` whose `accessToken` function pulls from a closure will work, but make sure that closure is rebuilt for each incoming request (i.e., the request handler creates a fresh requester) — otherwise you risk token mixing across concurrent users.
- **The `accessToken` function can be sync or async.** A plain string is also fine when the backend wants to do a single operation with a known token.
