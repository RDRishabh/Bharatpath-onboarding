/**
 * BharatPath — Subscription & Payments Service
 * Integrates with Backend endpoints:
 * - GET  /candidate/subscription/plans                  (what is for sale)
 * - GET  /candidate/subscription                        (state + has_access)
 * - POST /candidate/subscription/checkout               (open a payment)
 * - POST /candidate/subscription/checkout/discount-preview
 * - POST /candidate/subscription/cancel
 * - GET  /billing/payments/{payment_id}                 (poll the outcome)
 * - POST /billing/dev/payments/{payment_id}/simulate    (stub gateway only)
 *
 * Checkout grants nothing. A payment is PENDING until the gateway's signed
 * callback has been processed, so the app polls the payment and then re-reads
 * the subscription — `has_access` is the only field that decides what opens.
 */
import { apiRequest, ApiError } from './client';

export type PlanPeriod = 'MONTHLY' | 'QUARTERLY' | 'SEMESTER' | 'ANNUAL';

export type SubscriptionState =
  | 'NONE'
  | 'PENDING'
  | 'ACTIVE'
  | 'GRACE'
  | 'LAPSED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';

export interface PlanResponse {
  code: string;
  audience: 'CANDIDATE' | 'EMPLOYER' | 'COLLEGE';
  period: PlanPeriod | string;
  months: number;
  price_minor: number;
  currency: string;
  seat_allowance: number | null;
}

export interface SubscriptionResponse {
  state: SubscriptionState;
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
  list_amount_minor: number | null;
  currency: string;
  redirect_url: string | null;
}

export interface PaymentResponse {
  id: string;
  status: PaymentStatus;
  purpose: 'SUBSCRIPTION' | 'COURSE' | 'INTERVIEW_SESSION' | 'MANDATE_DEBIT';
  item_code: string;
  amount_minor: number;
  list_amount_minor: number | null;
  currency: string;
  failure_code: string | null;
  created_at: string;
  settled_at: string | null;
}

export interface DiscountPreviewResponse {
  list_amount_minor: number;
  discount_minor: number;
  amount_minor: number;
}

// ─── Requests ──────────────────────────────────────────────────

export async function listCandidatePlans(): Promise<PlanResponse[]> {
  return apiRequest<PlanResponse[]>('/candidate/subscription/plans');
}

export async function getCandidateSubscription(): Promise<SubscriptionResponse> {
  return apiRequest<SubscriptionResponse>('/candidate/subscription');
}

export async function previewDiscount(
  planCode: string,
  discountCode: string
): Promise<DiscountPreviewResponse> {
  return apiRequest<DiscountPreviewResponse>('/candidate/subscription/checkout/discount-preview', {
    method: 'POST',
    body: { plan_code: planCode, discount_code: discountCode },
  });
}

export async function checkoutSubscription(
  planCode: string,
  discountCode?: string
): Promise<CheckoutResponse> {
  return apiRequest<CheckoutResponse>('/candidate/subscription/checkout', {
    method: 'POST',
    body: discountCode
      ? { plan_code: planCode, discount_code: discountCode }
      : { plan_code: planCode },
  });
}

export async function cancelCandidateSubscription(): Promise<SubscriptionResponse> {
  return apiRequest<SubscriptionResponse>('/candidate/subscription/cancel', { method: 'POST' });
}

export async function getPayment(paymentId: string): Promise<PaymentResponse> {
  return apiRequest<PaymentResponse>(`/billing/payments/${paymentId}`);
}

/**
 * Only registered when the backend runs PAYMENTS_PROVIDER=stub, which
 * `Settings` refuses in staging and production. It signs the callback the
 * stub gateway would send and runs the ordinary verification path, so the
 * entitlement is granted exactly as a real payment would grant it.
 */
export async function settleStubPayment(
  paymentId: string,
  outcome: 'SUCCEEDED' | 'FAILED'
): Promise<PaymentResponse> {
  return apiRequest<PaymentResponse>(`/billing/dev/payments/${paymentId}/simulate`, {
    method: 'POST',
    body: { outcome },
  });
}

// ─── Presentation helpers ──────────────────────────────────────

/** The stub gateway's checkout host. Nothing is hosted there. */
export function isStubCheckout(redirectUrl: string | null | undefined): boolean {
  return !!redirectUrl && redirectUrl.includes('stub-payments.invalid');
}

/** Paise to rupees, grouped the Indian way: 119900 → "₹1,19,900" → "₹1,199". */
export function formatMinor(minor: number): string {
  const rupees = minor / 100;
  const whole = Math.floor(rupees);
  const paise = Math.round((rupees - whole) * 100);
  const digits = String(whole);
  const head = digits.length > 3 ? digits.slice(0, digits.length - 3) : '';
  const tail = digits.slice(-3);
  const grouped = head ? `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${tail}` : tail;
  return paise > 0 ? `₹${grouped}.${String(paise).padStart(2, '0')}` : `₹${grouped}`;
}

const PERIOD_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: '3 months',
  SEMESTER: '6 months',
  ANNUAL: '12 months',
};

export function periodLabel(plan: PlanResponse): string {
  return PERIOD_LABELS[plan.period] || `${plan.months} months`;
}

export function perMonthMinor(plan: PlanResponse): number {
  return Math.round(plan.price_minor / Math.max(plan.months, 1));
}

export function formatPeriodEnd(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATE_COPY: Record<SubscriptionState, string> = {
  NONE: 'Not a member yet',
  PENDING: 'Waiting for the bank to confirm',
  ACTIVE: 'Membership active',
  GRACE: 'Renewal being retried',
  LAPSED: 'Membership ended',
  CANCELLED: 'Cancelled — runs to the end of the paid period',
};

export function subscriptionStateCopy(state: SubscriptionState): string {
  return STATE_COPY[state] || state;
}

const CODE_MESSAGES: Record<string, string> = {
  payments_unavailable: 'Payments are not switched on for this backend yet.',
  plan_not_found: 'That plan is no longer on sale. Pick another one.',
  discount_code_invalid: 'That code is not valid.',
  discount_code_expired: 'That code has expired.',
  discount_code_exhausted: 'That code has been used up.',
  discount_code_already_used: 'You have already used that code.',
  discount_exceeds_price: 'That code cannot be used on this plan.',
  subscription_not_active: 'There is no live membership to change.',
  network_error: 'Cannot reach the BharatPath API. Check that the backend is running.',
};

/** One message per known problem code; the API's own title otherwise. */
export function billingErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return CODE_MESSAGES[error.code] || error.problem.title || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

const FAILURE_MESSAGES: Record<string, string> = {
  insufficient_funds: 'The bank reported insufficient funds. Nothing was charged.',
  cancelled_by_payer: 'The payment was cancelled. Nothing was charged.',
  timeout: 'The payment timed out before the bank confirmed it.',
};

export function paymentFailureMessage(failureCode: string | null): string {
  if (!failureCode) return 'The payment did not go through. Nothing was charged.';
  return (
    FAILURE_MESSAGES[failureCode] ||
    `The payment did not go through (${failureCode}). Nothing was charged.`
  );
}
