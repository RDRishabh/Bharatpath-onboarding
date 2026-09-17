import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import type {
  NotificationResponse,
} from "@/features/notifications/types/notification.types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export const notificationApi = createApi({
  reducerPath: "notificationApi",

  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,

    credentials: "include",

    prepareHeaders: (headers) => {
      headers.set(
        "Content-Type",
        "application/json"
      );

      return headers;
    },
  }),

  tagTypes: ["Notifications"],

  endpoints: (builder) => ({
    getNotifications: builder.query<
      NotificationResponse,
      {
        limit?: number;
      }
    >({
      query: ({ limit = 10 } = {}) => ({
        url: "/notifications",
        method: "GET",
        params: {
          limit,
        },
      }),

      providesTags: ["Notifications"],
    }),

    markNotificationRead: builder.mutation<
      void,
      string
    >({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/read`,
        method: "PATCH",
      }),

      invalidatesTags: ["Notifications"],
    }),

    markAllNotificationsRead: builder.mutation<
      void,
      void
    >({
      query: () => ({
        url: "/notifications/read-all",
        method: "PATCH",
      }),

      invalidatesTags: ["Notifications"],
    }),

    deleteNotification: builder.mutation<
      void,
      string
    >({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}`,
        method: "DELETE",
      }),

      invalidatesTags: ["Notifications"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
} = notificationApi;