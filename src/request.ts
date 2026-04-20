import { type $Fetch, type FetchOptions, FetchError, ofetch } from "ofetch";

import { GristApiError, GristNetworkError } from "./errors.ts";

export interface GristRequestConfig {
  baseDocUrl: string;
  apiKey: string;
  fetchOptions?: FetchOptions;
}

export interface GristRequester {
  fetch: $Fetch;
  baseDocUrl: string;
  request: <T = unknown>(path: string, options?: FetchOptions) => Promise<T>;
}

export function createRequester(config: GristRequestConfig): GristRequester {
  const baseDocUrl = config.baseDocUrl.replace(/\/+$/, "");
  const base = ofetch.create({
    headers: { Authorization: `Bearer ${config.apiKey}` },
    ...config.fetchOptions,
  });

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
