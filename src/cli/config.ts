import { config as loadDotenv } from "dotenv";

import type { AccessTokenSource } from "../request.ts";

export interface ResolvedConfig {
  baseDocUrl: string;
  apiKey?: string;
  accessToken?: AccessTokenSource;
}

export interface SharedCliOptions {
  docUrl?: string;
  apiKey?: string;
  accessToken?: string;
  envFile?: string;
}

export function resolveConfig(options: SharedCliOptions): ResolvedConfig {
  loadDotenv({ quiet: true, ...(options.envFile ? { path: options.envFile } : {}) });

  const baseDocUrl = options.docUrl ?? process.env.GRIST_DOC_URL;
  const apiKey = options.apiKey ?? process.env.GRIST_API_KEY;
  const accessToken = options.accessToken ?? process.env.GRIST_ACCESS_TOKEN;

  if (!baseDocUrl) {
    throw new Error("Grist doc URL is required. Pass --doc-url or set GRIST_DOC_URL.");
  }
  return { baseDocUrl, apiKey, accessToken };
}
