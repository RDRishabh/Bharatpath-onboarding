"use client";

import { useState } from "react";

import { DiscountCodeField, type DiscountPreview } from "@/components/billing/discount-code-field";
import { SimulatedPaymentDialog } from "@/components/billing/simulated-payment-dialog";
import { StudentPage } from "@/features/student/shell";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { isStubPaymentUrl } from "@/store/api/payment.api";
import { type CandidateCheckout, useCancelCandidateSubscriptionMutation, useCheckoutCandidateSubscriptionMutation, useGetCandidatePlansQuery, useGetCandidateSubscriptionQuery, usePreviewCandidateDiscountMutation } from "@/store/student";

const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount / 100);

export default function CandidateSubscriptionPage() {
  const { data: subscription, isLoading: subscriptionLoading, refetch: refetchSubscription } = useGetCandidateSubscriptionQuery();
  const { data: plans = [], isLoading: plansLoading } = useGetCandidatePlansQuery();
  const [preview] = usePreviewCandidateDiscountMutation();
  const [checkout, checkoutState] = useCheckoutCandidateSubscriptionMutation();
  const [cancel, cancelState] = useCancelCandidateSubscriptionMutation();
  const [discounts, setDiscounts] = useState<Record<string, { code: string | null; price: DiscountPreview | null }>>({});
  const [error, setError] = useState<string | null>(null);
  const [simulatedCheckout, setSimulatedCheckout] = useState<CandidateCheckout | null>(null);

  async function buy(planCode: string) {
    setError(null);
    try {
      const result = await checkout({ planCode, discountCode: discounts[planCode]?.code ?? undefined }).unwrap();
      if (isStubPaymentUrl(result.redirect_url)) setSimulatedCheckout(result);
      else if (result.redirect_url) window.location.assign(result.redirect_url);
      else setError("Checkout was created, but no payment page was returned.");
    } catch (checkoutError) {
      setError(getApiErrorMessage(checkoutError, "Checkout could not be started."));
    }
  }

  return <StudentPage><div className="flex flex-col gap-5">
    <section className="rounded-[20px] border border-[#E7E0D4] bg-white p-4 sm:p-5">
      <h2 className="text-[16px] font-bold text-[#0A1931]">Current subscription</h2>
      {subscriptionLoading ? <p className="mt-3 text-sm text-[#5F6B80]">Loading…</p> : <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <strong className="text-[#0A1931]">{subscription?.state ?? "NONE"}</strong>
        <span className={subscription?.has_access ? "font-semibold text-[#23805d]" : "text-[#5F6B80]"}>{subscription?.has_access ? "Access active" : "No active paid access"}</span>
        {subscription?.current_period_end ? <span className="text-[#5F6B80]">Until {new Date(subscription.current_period_end).toLocaleDateString("en-IN")}</span> : null}
        {subscription?.has_access && !subscription.cancel_at ? <button type="button" disabled={cancelState.isLoading} onClick={() => void cancel()} className="ml-auto rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50">{cancelState.isLoading ? "Cancelling…" : "Cancel renewal"}</button> : null}
      </div>}
    </section>

    {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

    {plansLoading ? <p className="text-sm text-[#5F6B80]">Loading plans…</p> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {plans.map((plan) => <section key={plan.code} className="rounded-[20px] border border-[#E7E0D4] bg-white p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase text-[#5F6B80]">{plan.period}</p>
        <p className="mt-2 text-3xl font-bold text-[#0A1931]">{money(plan.price_minor)}</p>
        <p className="mt-1 text-sm text-[#5F6B80]">{plan.months} month{plan.months === 1 ? "" : "s"}</p>
        <DiscountCodeField tone="student" planCode={plan.code} preview={(args) => preview(args).unwrap()} onChange={(code, price) => setDiscounts((current) => ({ ...current, [plan.code]: { code, price } }))} />
        <button type="button" disabled={checkoutState.isLoading} onClick={() => void buy(plan.code)} className="mt-4 w-full rounded-lg bg-[#5F4DB2] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#4A3E8F] disabled:opacity-50">{checkoutState.isLoading ? "Starting checkout…" : `Continue · ${money(discounts[plan.code]?.price?.amount_minor ?? plan.price_minor)}`}</button>
      </section>)}
    </div>}
    {simulatedCheckout ? <SimulatedPaymentDialog paymentId={simulatedCheckout.payment_id} amountMinor={simulatedCheckout.amount_minor} currency={simulatedCheckout.currency} title="BharatPath membership" onComplete={() => refetchSubscription()} onClose={() => setSimulatedCheckout(null)} /> : null}
  </div></StudentPage>;
}
