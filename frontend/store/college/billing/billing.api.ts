import { baseApi } from "@/store/api/base-api";

import type {
  CheckoutResult,
  CollegePlan,
  CollegeSubscription,
  MandateResult,
  Payment,
} from "@/store/college/types";

/* =========================================================
   Plans
========================================================= */

interface PlanResponse {
  code: string;
  audience: "CANDIDATE" | "EMPLOYER" | "COLLEGE";
  period: string;
  months: number;
  price_minor: number;
  currency: string;
  seat_allowance: number | null;
}

function mapPlan(plan: PlanResponse): CollegePlan {
  return {
    code: plan.code,
    audience: plan.audience,
    period:
      plan.period as CollegePlan["period"],
    months: plan.months,
    priceMinor: plan.price_minor,
    currency: plan.currency,
    seatAllowance: plan.seat_allowance,
  };
}

/* =========================================================
   Subscription
========================================================= */

interface SubscriptionResponse {
  state: CollegeSubscription["state"];
  has_access: boolean;
  plan_code: string | null;
  period: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
  renews_automatically: boolean;
  mandate_state: string | null;
}

function mapSubscription(
  response: SubscriptionResponse,
): CollegeSubscription {
  return {
    state: response.state,
    hasAccess: response.has_access,
    planCode: response.plan_code,
    period: response.period,
    currentPeriodStart: response.current_period_start,
    currentPeriodEnd: response.current_period_end,
    cancelAt: response.cancel_at,
    renewsAutomatically: response.renews_automatically,
    mandateState: response.mandate_state,
  };
}

/* =========================================================
   Checkout
========================================================= */

interface CheckoutResponse {
  payment_id: string;
  status: string;
  amount_minor: number;
  currency: string;
  redirect_url: string | null;
}

function mapCheckout(
  response: CheckoutResponse,
): CheckoutResult {
  return {
    paymentId: response.payment_id,
    status: response.status,
    amountMinor: response.amount_minor,
    currency: response.currency,
    redirectUrl: response.redirect_url,
  };
}

/* =========================================================
   Mandate
========================================================= */

interface MandateResponse {
  state: string;
  max_amount_minor: number;
  valid_until: string | null;
  authorisation_url: string;
}

function mapMandate(
  response: MandateResponse,
): MandateResult {
  return {
    state: response.state,
    maxAmountMinor: response.max_amount_minor,
    validUntil: response.valid_until,
    authorisationUrl: response.authorisation_url,
  };
}

/* =========================================================
   Payment status (GET /billing/payments/{payment_id})
========================================================= */

interface PaymentResponse {
  id: string;
  status: Payment["status"];
  purpose: string;
  item_code: string;
  amount_minor: number;
  currency: string;
  failure_code: string | null;
  created_at: string;
  settled_at: string | null;
}

function mapPayment(response: PaymentResponse): Payment {
  return {
    id: response.id,
    status: response.status,
    purpose: response.purpose,
    itemCode: response.item_code,
    amountMinor: response.amount_minor,
    currency: response.currency,
    failureCode: response.failure_code,
    createdAt: response.created_at,
    settledAt: response.settled_at,
  };
}

export const collegeBillingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCollegePlans: builder.query<CollegePlan[], void>({
      query: () => ({
        url: "/college/subscription/plans",
        method: "GET",
      }),
      transformResponse: (response: PlanResponse[]) =>
        response.map(mapPlan),
      providesTags: [{ type: "Billing", id: "PLANS" }],
    }),

    getCollegeSubscription: builder.query<
      CollegeSubscription,
      void
    >({
      query: () => ({
        url: "/college/subscription",
        method: "GET",
      }),
      transformResponse: mapSubscription,
      providesTags: [
        { type: "Billing", id: "SUBSCRIPTION" },
      ],
    }),

    createCollegeCheckout: builder.mutation<
      CheckoutResult,
      { planCode: string }
    >({
      query: (payload) => ({
        url: "/college/subscription/checkout",
        method: "POST",
        body: { plan_code: payload.planCode },
      }),
      transformResponse: mapCheckout,
    }),

    cancelCollegeSubscription: builder.mutation<
      CollegeSubscription,
      void
    >({
      query: () => ({
        url: "/college/subscription/cancel",
        method: "POST",
      }),
      transformResponse: mapSubscription,
      invalidatesTags: [
        { type: "Billing", id: "SUBSCRIPTION" },
      ],
    }),

    createCollegeMandate: builder.mutation<
      MandateResult,
      void
    >({
      query: () => ({
        url: "/college/subscription/mandate",
        method: "POST",
      }),
      transformResponse: mapMandate,
    }),

    getPayment: builder.query<Payment, string>({
      query: (paymentId) => ({
        url: `/billing/payments/${paymentId}`,
        method: "GET",
      }),
      transformResponse: mapPayment,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCollegePlansQuery,
  useGetCollegeSubscriptionQuery,
  useCreateCollegeCheckoutMutation,
  useCancelCollegeSubscriptionMutation,
  useCreateCollegeMandateMutation,
  useGetPaymentQuery,
} = collegeBillingApi;