export const API_CONFIG = {
  baseUrl:
    process.env.NEXT_PUBLIC_API_URL ??
    "https://bharatpath-api.duckdns.org/api/v1",

  timeout: 15000,
} as const;