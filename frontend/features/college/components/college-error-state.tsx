"use client";

import { useRouter } from "next/navigation";

import { ErrorState, type ErrorStateProps } from "@/components/ui";
import { getApiErrorCode, getApiErrorStatus } from "@/lib/api/error-message";

export const COLLEGE_BILLING_HREF = "/college/settings?tab=billing";

export function isSubscriptionRequired(error: unknown): boolean {
  return (
    getApiErrorCode(error) === "subscription_required" ||
    getApiErrorStatus(error) === 402
  );
}

/** The first error in the list that is a missing subscription, if any. */
export function firstSubscriptionError(...errors: unknown[]): unknown {
  return errors.find((error) => error && isSubscriptionRequired(error));
}

/**
 * The one error surface for the college portal. A college that has not bought
 * a plan gets the same "Subscription required" panel on every screen instead
 * of zeros or a vague failure; every other error uses the same block panel.
 *
 * Use `variant="inline"` only for a banner inside a form or beside a control.
 */
export function CollegeErrorState({
  variant = "block",
  ...props
}: Readonly<ErrorStateProps>) {
  const router = useRouter();

  if (isSubscriptionRequired(props.error)) {
    return (
      <ErrorState
        {...props}
        variant="block"
        title="Subscription required"
        message="Your institution has no active subscription. Buy a plan to use this part of BharatPath."
        onRetry={undefined}
        action={
          <button
            type="button"
            onClick={() => router.push(COLLEGE_BILLING_HREF)}
            className="cursor-pointer rounded-lg bg-[#17233a] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#223453]"
          >
            View plans
          </button>
        }
      />
    );
  }

  return (
    <ErrorState
      {...props}
      variant={variant}
      title={variant === "block" ? (props.title ?? "Something went wrong") : props.title}
    />
  );
}
