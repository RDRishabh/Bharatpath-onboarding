import { baseApi } from "@/store/api/base-api";

export type CandidatePlan = { code: string; audience: "CANDIDATE"; period: string; months: number; price_minor: number; seat_allowance: null };
export type CandidateSubscription = { state: string; has_access: boolean; plan_code: string | null; period: string | null; current_period_start: string | null; current_period_end: string | null; cancel_at: string | null; renews_automatically: boolean; mandate_state: string | null };
export type CandidateCheckout = { payment_id: string; status: string; amount_minor: number; list_amount_minor: number | null; currency: string; redirect_url: string | null };

export const candidateBillingApi = baseApi.injectEndpoints({ endpoints: (builder) => ({
  getCandidatePlans: builder.query<CandidatePlan[], void>({ query: () => "/candidate/subscription/plans", providesTags: [{ type: "Billing", id: "CANDIDATE_PLANS" }] }),
  getCandidateSubscription: builder.query<CandidateSubscription, void>({ query: () => "/candidate/subscription", providesTags: [{ type: "Billing", id: "CANDIDATE_SUBSCRIPTION" }] }),
  previewCandidateDiscount: builder.mutation<{ list_amount_minor: number; discount_minor: number; amount_minor: number }, { planCode: string; discountCode: string }>({ query: ({ planCode, discountCode }) => ({ url: "/candidate/subscription/checkout/discount-preview", method: "POST", body: { plan_code: planCode, discount_code: discountCode } }) }),
  checkoutCandidateSubscription: builder.mutation<CandidateCheckout, { planCode: string; discountCode?: string }>({ query: ({ planCode, discountCode }) => ({ url: "/candidate/subscription/checkout", method: "POST", body: { plan_code: planCode, ...(discountCode ? { discount_code: discountCode } : {}) } }), invalidatesTags: [{ type: "Billing", id: "CANDIDATE_SUBSCRIPTION" }] }),
  cancelCandidateSubscription: builder.mutation<CandidateSubscription, void>({ query: () => ({ url: "/candidate/subscription/cancel", method: "POST" }), invalidatesTags: [{ type: "Billing", id: "CANDIDATE_SUBSCRIPTION" }] }),
}), overrideExisting: false });

export const { useGetCandidatePlansQuery, useGetCandidateSubscriptionQuery, usePreviewCandidateDiscountMutation, useCheckoutCandidateSubscriptionMutation, useCancelCandidateSubscriptionMutation } = candidateBillingApi;
