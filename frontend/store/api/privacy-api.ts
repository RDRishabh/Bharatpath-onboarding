import { baseApi } from "./base-api";

export type PrivacyRequest = { id: string; type: "EXPORT" | "DELETE"; state: string; created_at: string; due_at: string; completed_at: string | null; erasable_at: string | null; download_available: boolean };

export const privacyApi = baseApi.injectEndpoints({ endpoints: (builder) => ({
  getPrivacyRequests: builder.query<{ items: PrivacyRequest[] }, void>({ query: () => "/privacy/requests", providesTags: ["Student"] }),
  getPrivacyRequest: builder.query<PrivacyRequest, string>({ query: (id) => `/privacy/requests/${id}`, providesTags: ["Student"] }),
  requestPrivacyExport: builder.mutation<PrivacyRequest, void>({ query: () => ({ url: "/privacy/requests/export", method: "POST" }), invalidatesTags: ["Student"] }),
  requestPrivacyDeletion: builder.mutation<PrivacyRequest, void>({ query: () => ({ url: "/privacy/requests/deletion", method: "POST" }), invalidatesTags: ["Student"] }),
  withdrawPrivacyRequest: builder.mutation<PrivacyRequest, string>({ query: (id) => ({ url: `/privacy/requests/${id}/withdraw`, method: "POST" }), invalidatesTags: ["Student"] }),
  getPrivacyDownload: builder.mutation<{ url: string; expires_in_seconds: number }, string>({ query: (id) => ({ url: `/privacy/requests/${id}/download`, method: "GET" }) }),
}) });

export const { useGetPrivacyRequestsQuery, useGetPrivacyRequestQuery, useRequestPrivacyExportMutation, useRequestPrivacyDeletionMutation, useWithdrawPrivacyRequestMutation, useGetPrivacyDownloadMutation } = privacyApi;
