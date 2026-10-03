import { baseApi } from "@/store/api/base-api";

export type PaymentStatus = {
  id: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  purpose: string;
  item_code: string;
  amount_minor: number;
  currency: string;
  failure_code: string | null;
  created_at: string;
  settled_at: string | null;
};

export const paymentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    simulatePayment: builder.mutation<
      PaymentStatus,
      { paymentId: string; outcome?: "SUCCEEDED" | "FAILED" }
    >({
      query: ({ paymentId, outcome = "SUCCEEDED" }) => ({
        url: `/billing/dev/payments/${paymentId}/simulate`,
        method: "POST",
        body: { outcome },
      }),
      invalidatesTags: ["Billing"],
    }),
  }),
  overrideExisting: false,
});

export const { useSimulatePaymentMutation } = paymentApi;

export function isStubPaymentUrl(url: string | null): boolean {
  if (!url) return false;

  try {
    return new URL(url).hostname === "stub-payments.invalid";
  } catch {
    return false;
  }
}
