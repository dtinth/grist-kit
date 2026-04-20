import { config as loadDotenv } from "dotenv";

export interface ResolvedConfig {
  baseDocUrl: string;
  apiKey: string;
}

export interface SharedCliOptions {
  docUrl?: string;
  apiKey?: string;
  envFile?: string;
}

export function resolveConfig(options: SharedCliOptions): ResolvedConfig {
  loadDotenv(options.envFile ? { path: options.envFile } : undefined);

  const baseDocUrl = options.docUrl ?? process.env.GRIST_DOC_URL;
  const apiKey = options.apiKey ?? process.env.GRIST_API_KEY;

  if (!baseDocUrl) {
    throw new Error("Grist doc URL is required. Pass --doc-url or set GRIST_DOC_URL.");
  }
  if (!apiKey) {
    throw new Error("Grist API key is required. Pass --api-key or set GRIST_API_KEY.");
  }
  return { baseDocUrl, apiKey };
}
