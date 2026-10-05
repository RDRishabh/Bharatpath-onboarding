import {
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";

import { getStoredToken } from "@/lib/auth/token";
import { handleSessionExpired } from "@/lib/auth/handle-session-expired";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://bharatpath-api.duckdns.org/api/v1";

function serializeParams(params: Record<string, unknown>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      searchParams.append(key, String(item));
    }
  }

  return searchParams.toString();
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,

  paramsSerializer: serializeParams,

  credentials: "include",

  prepareHeaders: (headers) => {
    headers.set(
      "Accept",
      "application/json",
    );

    /*
     * The signed-in user's token, minted at login and kept in local
     * storage, authenticates every direct backend call. Falls back to the
     * local-dev NEXT_PUBLIC_API_BEARER_TOKEN when no one is signed in.
     */
    const bearerToken =
      getStoredToken() ?? process.env.NEXT_PUBLIC_API_BEARER_TOKEN;

    if (bearerToken) {
      headers.set(
        "Authorization",
        `Bearer ${bearerToken}`,
      );
    }

    return headers;
  },
});

export const baseApi = createApi({
  reducerPath: "api",

  baseQuery: async (args, api, extraOptions) => {
    const hadSession = Boolean(getStoredToken());
    const result = await rawBaseQuery(args, api, extraOptions);
    if (hadSession && result.error?.status === 401) handleSessionExpired();
    return result;
  },

  tagTypes: [
    "Auth",
    "Admin",
    "College",
    "Student",
    "Analytics",
    "Billing",
    "Job",
    "Candidate",
    "Application",
    "Team",
    "Kyb",
  ],

  endpoints: () => ({}),
});
