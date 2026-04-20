import { type $Fetch, type FetchOptions, FetchError, ofetch } from "ofetch";

import { GristApiError, GristNetworkError } from "./errors.ts";

/** Configuration for creating a requester bound to a single Grist document. */
export interface GristRequestConfig {
  /** Base URL of the Grist document, with or without a trailing slash. */
  baseDocUrl: string;
  /** Omit or pass an empty string for unauthenticated Grist instances. */
  apiKey?: string;
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
  const headers: Record<string, string> = {};
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
  const base = ofetch.create({ headers, ...config.fetchOptions });

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

function buildMessage(error: FetchError): string {
  const status = error.response?.status;
  const body = error.data;
  const detail =
    body && typeof body === "object" && "error" in body
      ? String((body as { error: unknown }).error)
      : error.message;
  return `Grist API ${status ?? "error"}: ${detail}`;
}
