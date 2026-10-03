"use client";

import { useRouter } from "next/navigation";

import { ErrorState, type ErrorStateProps } from "@/components/ui";
import { getApiErrorCode, getApiErrorStatus } from "@/lib/api/error-message";
import { setActiveTab } from "@/store/employer/settings";
import { useAppDispatch } from "@/store/hooks";

export function isSubscriptionRequired(error: unknown): boolean {
  return (
    getApiErrorCode(error) === "subscription_required" ||
    getApiErrorStatus(error) === 402
  );
}

/**
 * The one error surface for the employer portal. Every page and section that
 * fails to load renders through it, so a missing subscription (402) looks and
 * reads the same on Candidates, Jobs, Applications and the rest, and every
 * other failure uses the same panel.
 *
 * Use `variant="inline"` only for a banner inside a form or beside a control.
 */
export function EmployerErrorState({
  variant = "block",
  ...props
}: Readonly<ErrorStateProps>) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  if (isSubscriptionRequired(props.error)) {
    return (
      <ErrorState
        {...props}
        variant="block"
        title="Subscription required"
        message="An active subscription is required to use this part of BharatPath."
        onRetry={undefined}
        action={
          <button
            type="button"
            onClick={() => {
              // The settings page keeps its tab in Redux, not the URL.
              dispatch(setActiveTab("subscription"));
              router.push("/employer/settings");
            }}
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
