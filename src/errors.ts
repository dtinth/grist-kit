import type { FetchError } from "ofetch";

/** Initialization data used to construct a {@link GristApiError}. */
export interface GristApiErrorInit {
  /** HTTP status code returned by the Grist API. */
  status: number;
  /** Response payload returned by the Grist API, if any. */
  body: unknown;
  /** Request URL that failed. */
  url: string;
  /** Uppercase HTTP method used for the request. */
  method: string;
  /** Original fetch error thrown by the underlying client. */
  cause: FetchError;
}

/** Error thrown when the Grist API responds with a non-success status code. */
export class GristApiError extends Error {
  /** HTTP status code returned by the Grist API. */
  readonly status: number;
  /** Response payload returned by the Grist API, if any. */
  readonly body: unknown;
  /** Request URL that failed. */
  readonly url: string;
  /** Uppercase HTTP method used for the request. */
  readonly method: string;

  /** Creates a new API error with Grist response details attached. */
  constructor(message: string, init: GristApiErrorInit) {
    super(message, { cause: init.cause });
    this.name = "GristApiError";
    this.status = init.status;
    this.body = init.body;
    this.url = init.url;
    this.method = init.method;
  }
}

/** Error thrown when a request fails before receiving a Grist API response. */
export class GristNetworkError extends Error {
  /** Creates a new network error. */
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GristNetworkError";
  }
}
