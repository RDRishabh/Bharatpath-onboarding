export const API_CONFIG = {
  baseUrl:
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8099",

  timeout: 15000,
} as const;