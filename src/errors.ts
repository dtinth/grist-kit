import type { FetchError } from "ofetch";

export interface GristApiErrorInit {
  status: number;
  body: unknown;
  url: string;
  method: string;
  cause: FetchError;
}

export class GristApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly url: string;
  readonly method: string;

  constructor(message: string, init: GristApiErrorInit) {
    super(message, { cause: init.cause });
    this.name = "GristApiError";
    this.status = init.status;
    this.body = init.body;
    this.url = init.url;
    this.method = init.method;
  }
}

export class GristNetworkError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GristNetworkError";
  }
}
