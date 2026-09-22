"use client";

import { ChevronRight, CreditCard, ShieldCheck } from "lucide-react";

import { Skeleton } from "@/components/common/loading";
import type { EmployerSubscription } from "@/store/employer/billing";

interface SubscriptionStatusButtonProps {
  subscription: EmployerSubscription | undefined;
  isLoading: boolean;
  onClick: () => void;
}

interface StatusView {
  label: string;
  detail: string;
  active: boolean;
  /** Fraction of the current period still remaining, 0–100, or null. */
  progress: number | null;
}

function toView(
  subscription: EmployerSubscription | undefined,
): StatusView {
  if (!subscription || subscription.state === "NONE") {
    return {
      label: "No subscription",
      detail: "Choose a plan",
      active: false,
      progress: null,
    };
  }

  const { state, has_access } = subscription;

  // Remaining-days / period detail is intentionally omitted until the credits
  // API exists; only the status label is shown for an active plan.
  if (has_access) {
    return {
      label: state === "GRACE" ? "In grace" : "Active",
      detail: state === "GRACE" ? "Renewal pending" : "",
      active: true,
      progress: null,
    };
  }

  switch (state) {
    case "PENDING":
      return { label: "Payment pending", detail: "Finish checkout", active: false, progress: null };
    case "LAPSED":
      return { label: "Expired", detail: "Renew to continue", active: false, progress: null };
    case "CANCELLED":
      return { label: "Cancelled", detail: "Reactivate a plan", active: false, progress: null };
    default:
      return { label: "Inactive", detail: "Choose a plan", active: false, progress: null };
  }
}

const SHELL =
  "flex h-[40px] w-[184px] shrink-0 items-center gap-[10px] rounded-xl border border-[#e5e7ec] bg-white px-[10px] pl-[6px]";

export function SubscriptionStatusButton({
  subscription,
  isLoading,
  onClick,
}: SubscriptionStatusButtonProps) {
  if (isLoading) {
    return (
      <div
        className={SHELL}
        aria-hidden="true"
        aria-busy="true"
      >
        <Skeleton width={28} height={28} radius={8} />

        <span className="flex min-w-0 flex-1 flex-col gap-[6px]">
          <Skeleton width="70%" height={11} radius={6} />
          <Skeleton width={96} height={4} radius={9999} />
        </span>
      </div>
    );
  }

  const view = toView(subscription);
  const Icon = view.active ? ShieldCheck : CreditCard;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Subscription: ${view.label}. ${view.detail}. Open billing`}
      title={`${view.label} — ${view.detail}`}
      className={`${SHELL} cursor-pointer transition-colors hover:border-[#cfd3dc] hover:bg-[#f7f9fc]`}
    >
      <span
        className={`grid h-[28px] w-[28px] shrink-0 place-items-center rounded-[8px] ${
          view.active ? "bg-[#e6f4ed]" : "bg-[#edf2fa]"
        }`}
      >
        <Icon
          size={14}
          strokeWidth={2.2}
          className={view.active ? "text-[#13875e]" : "text-[#2c62c4]"}
        />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-[3px] text-left">
        <span className="flex items-baseline gap-[6px]">
          <span className="whitespace-nowrap text-[12px] font-[600] leading-[16px] text-[#131A26]">
            {view.label}
          </span>

          <span className="truncate text-[11px] font-[400] leading-[14px] text-[#5D6673]">
            {view.detail}
          </span>
        </span>

        {view.progress !== null && (
          <span className="block h-[3.5px] w-[96px] overflow-hidden rounded-full bg-[#e5e7ec]">
            <span
              className="block h-full rounded-full bg-[#13875e]"
              style={{ width: `${view.progress}%` }}
            />
          </span>
        )}
      </span>

      <ChevronRight
        size={14}
        strokeWidth={2}
        className="shrink-0 text-[#777f90]"
      />
    </button>
  );
}
