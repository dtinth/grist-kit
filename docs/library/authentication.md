# Authentication

grist-kit supports two ways to authenticate against a Grist document: an API key, or a Grist access token. They differ in lifetime, scope, and how they are sent on the wire. Pick the one that matches your use case.

## API key

```ts
import { gristDoc } from "grist-kit";

const doc = gristDoc({
  baseDocUrl: process.env.GRIST_DOC_URL!,
  apiKey: process.env.GRIST_API_KEY,
});
```

API keys are long-lived credentials tied to a single Grist user. They are sent as `Authorization: Bearer <key>` on every request. Generate one in Grist's **Profile Settings → API**. Use this when you have a stable server-to-server trust relationship with Grist.

## Access token

```ts
import { gristDoc } from "grist-kit";

const doc = gristDoc({
  baseDocUrl: tokenInfo.baseUrl,
  accessToken: () => tokenInfo.token,
});
```

Access tokens are short-lived (15-minute default TTL), document-scoped JWTs. They are sent as a `?auth=<token>` query parameter on every request. They are the auth mechanism used by Grist's custom-widget API — see [Custom Widgets](custom-widgets) for how to obtain one and use it in widget code.

You may also pass a plain string instead of a function:

```ts
const doc = gristDoc({ baseDocUrl, accessToken: "eyJ…" });
```

A function is invoked **per request**, so use a function when the token may need to be refreshed (e.g., a widget whose user keeps the tab open for more than 15 minutes). Use a string when the token arrives from outside grist-kit (e.g., a backend that receives it in a request from a widget) and is used for a single short-lived operation.

## Mutual exclusion

You may not set both `apiKey` and `accessToken` at the same time. `createRequester` throws:

```
Specify either apiKey or accessToken, not both.
```

An empty string for either field is treated as "not set", so `apiKey: ""` + `accessToken: "tok"` is valid (only the access token is used).

## Unauthenticated

If neither field is set, requests are sent without any auth header or query parameter. This works for public Grist documents.

## Security checklist

These apply any time you authenticate with grist-kit, but they bite hardest in production. Worth a one-time read.

- **Do not log the token.** `?auth=<jwt>` shows up in URLs, which appear in Grist access logs, any HTTP middleware that logs request URLs, browser DevTools network panels, etc. Redact the `auth` query parameter in any log you produce.
- **Use HTTPS.** Tokens are bearer credentials. Any unencrypted hop leaks them.
- **Map Grist errors to caller errors.** A `GristApiError(401)` from grist-kit means the token is invalid or expired — surface a `401` (or `403`) to the caller, not a `500`. Do not echo Grist's error `body` to untrusted callers without filtering; it may include internal details.
- **Don't share a requester across requests with different tokens** on a backend. If the function form pulls from a closure over per-request state, make sure the closure is rebuilt for each incoming request (cheap — `ofetch.create` is just options assignment). Reusing one `gristDoc` across many requests with different tokens is a footgun.
- **Access tokens are document-scoped.** They grant access only to the document's content endpoints (tables, records, cells, attachments). They do **not** authorize workspace, ACL, or doc-metadata operations. If you need those, use an API key.
