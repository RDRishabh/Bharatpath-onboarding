import {
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8099/api/v1";

export const baseApi = createApi({
  reducerPath: "api",

  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,

    credentials: "include",

    prepareHeaders: (headers) => {
      headers.set(
        "Accept",
        "application/json",
      );

      /*
       * Local-dev only: lets you hit auth-gated employer
       * routes without wiring up the real login flow.
       * Set via NEXT_PUBLIC_API_BEARER_TOKEN, never in production.
       */
      const bearerToken = process.env.NEXT_PUBLIC_API_BEARER_TOKEN;

      if (bearerToken) {
        headers.set(
          "Authorization",
          `Bearer ${bearerToken}`,
        );
      }

      return headers;
    },
  }),

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
  ],

  endpoints: () => ({}),
});
