import { baseApi } from "@/store/api/base-api";

export interface EmployerPlan {
  code: string;
  audience: "EMPLOYER";
  period: string;
  months: number;
  price_minor: number;
  currency: string;
  seat_allowance: number | null;
}

export interface EmployerSubscription {
  state: "NONE" | "PENDING" | "ACTIVE" | "GRACE" | "LAPSED" | "CANCELLED";
  has_access: boolean;
  plan_code: string | null;
  period: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
  renews_automatically: boolean;
  mandate_state: string | null;
}

export interface CheckoutResponse {
  payment_id: string;
  status: string;
  amount_minor: number;
  currency: string;
  redirect_url: string | null;
  list_amount_minor?: number | null;
}

export interface DiscountPreviewResponse { list_amount_minor: number; discount_minor: number; amount_minor: number }

export const employerBillingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEmployerPlans: builder.query<EmployerPlan[], void>({
      query: () => "/employer/subscription/plans",
      providesTags: [{ type: "Billing", id: "EMPLOYER_PLANS" }],
    }),
    getEmployerSubscription: builder.query<EmployerSubscription, void>({
      query: () => "/employer/subscription",
      providesTags: [{ type: "Billing", id: "EMPLOYER_SUBSCRIPTION" }],
    }),
    checkoutEmployerSubscription: builder.mutation<CheckoutResponse, { planCode: string; discountCode?: string }>({
      query: ({ planCode, discountCode }) => ({ url: "/employer/subscription/checkout", method: "POST", body: { plan_code: planCode, ...(discountCode ? { discount_code: discountCode } : {}) } }),
      invalidatesTags: [{ type: "Billing", id: "EMPLOYER_SUBSCRIPTION" }],
    }),
    previewEmployerDiscount: builder.mutation<DiscountPreviewResponse, { planCode: string; discountCode: string }>({
      query: ({ planCode, discountCode }) => ({ url: "/employer/subscription/checkout/discount-preview", method: "POST", body: { plan_code: planCode, discount_code: discountCode } }),
    }),
    cancelEmployerSubscription: builder.mutation<EmployerSubscription, void>({
      query: () => ({ url: "/employer/subscription/cancel", method: "POST" }),
      invalidatesTags: [{ type: "Billing", id: "EMPLOYER_SUBSCRIPTION" }],
    }),
    createEmployerMandate: builder.mutation<
      { state: string; max_amount_minor: number; valid_until: string | null; authorisation_url: string },
      void
    >({
      query: () => ({ url: "/employer/subscription/mandate", method: "POST" }),
      invalidatesTags: [{ type: "Billing", id: "EMPLOYER_SUBSCRIPTION" }],
    }),
    getEmployerPayment: builder.query<
      { id: string; status: string; purpose: string; item_code: string; amount_minor: number; currency: string; failure_code: string | null; created_at: string; settled_at: string | null },
      string
    >({
      query: (paymentId) => `/billing/payments/${paymentId}`,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetEmployerPlansQuery,
  useGetEmployerSubscriptionQuery,
  useCheckoutEmployerSubscriptionMutation,
  usePreviewEmployerDiscountMutation,
  useCancelEmployerSubscriptionMutation,
  useCreateEmployerMandateMutation,
  useGetEmployerPaymentQuery,
} = employerBillingApi;
