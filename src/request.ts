import {
  type $Fetch,
  type FetchContext,
  type FetchHook,
  type FetchOptions,
  FetchError,
  ofetch,
} from "ofetch";

import { GristApiError, GristNetworkError } from "./errors.ts";

export type AccessTokenSource = string | (() => string | Promise<string>);

/** Configuration for creating a requester bound to a single Grist document. */
export interface GristRequestConfig {
  /** Base URL of the Grist document, with or without a trailing slash. */
  baseDocUrl: string;
  /** Omit or pass an empty string for unauthenticated Grist instances. */
  apiKey?: string;
  /**
   * Grist access token, sent as a `?auth=<token>` query parameter on every
   * request. Use a function to refresh the token lazily (e.g. from a custom
   * widget's `grist.docApi.getAccessToken()`). Mutually exclusive with `apiKey`.
   */
  accessToken?: AccessTokenSource;
  /** Additional options forwarded to the underlying `ofetch` client. */
  fetchOptions?: FetchOptions;
}

/** Low-level request helpers used by higher-level document and table APIs. */
export interface GristRequester {
  /** Configured `ofetch` instance used for raw requests. */
  fetch: $Fetch;
  /** Normalized base URL of the Grist document. */
  baseDocUrl: string;
  /** Sends a request relative to the Grist document base URL. */
  request: <T = unknown>(path: string, options?: FetchOptions) => Promise<T>;
}

/** Creates a low-level requester for Grist document API calls. */
export function createRequester(config: GristRequestConfig): GristRequester {
  const baseDocUrl = config.baseDocUrl.replace(/\/+$/, "");
  const apiKey = normalize(config.apiKey);
  const accessTokenSource = normalize(config.accessToken);

  if (apiKey && accessTokenSource) {
    throw new Error("Specify either apiKey or accessToken, not both.");
  }

  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const { onRequest: userOnRequest, ...restFetchOptions } = config.fetchOptions ?? {};
  const authInjector: FetchHook<FetchContext> = async ({ options }) => {
    if (!accessTokenSource) return;
    const token =
      typeof accessTokenSource === "string" ? accessTokenSource : await accessTokenSource();
    options.query = { ...options.query, auth: token };
  };
  const onRequest = userOnRequest
    ? [authInjector, ...(Array.isArray(userOnRequest) ? userOnRequest : [userOnRequest])]
    : authInjector;

  const base = ofetch.create({ headers, onRequest, ...restFetchOptions });

  const request = async <T = unknown>(path: string, options: FetchOptions = {}): Promise<T> => {
    const url = path.startsWith("http")
      ? path
      : `${baseDocUrl}${path.startsWith("/") ? path : `/${path}`}`;
    try {
      return (await base(url, options)) as T;
    } catch (error) {
      if (error instanceof FetchError) {
        if (error.response) {
          throw new GristApiError(buildMessage(error), {
            status: error.response.status,
            body: error.data,
            url,
            method: (options.method ?? "GET").toUpperCase(),
            cause: error,
          });
        }
        throw new GristNetworkError(error.message, { cause: error });
      }
      throw error;
    }
  };

  return { fetch: base, baseDocUrl, request };
}

function normalize<T extends string | AccessTokenSource>(value: T | undefined): T | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && value === "") return undefined;
  return value;
}

function buildMessage(error: FetchError): string {
  const status = error.response?.status;
  const body = error.data;
  const detail =
    body && typeof body === "object" && "error" in body
      ? String((body as { error: unknown }).error)
      : error.message;
  return `Grist API ${status ?? "error"}: ${detail}`;
}
