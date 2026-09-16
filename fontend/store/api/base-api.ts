import {
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8099";

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
      const devBearerToken =
        process.env.NEXT_PUBLIC_API_BEARER_TOKEN;

      if (devBearerToken) {
        headers.set(
          "Authorization",
          `Bearer ${devBearerToken}`,
        );
      }

      return headers;
    },
  }),

  tagTypes: [
    "Auth",
    "College",
    "Student",
    "Analytics",
    "Billing",
    "Job",
  ],

  endpoints: () => ({}),
});