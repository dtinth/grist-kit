---
grist-kit: minor
---

Add support for Grist access tokens (`?auth=` query parameter) in addition to API keys. Pass `accessToken: string | (() => string | Promise<string>)` to `gristDoc()` / `createRequester()`. CLI gains `--access-token` / `GRIST_ACCESS_TOKEN`. `apiKey` and `accessToken` are mutually exclusive. See the new `authentication` and `custom-widgets` doc pages.
