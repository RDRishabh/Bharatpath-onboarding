import { Armchair } from "lucide-react";

import type { HeaderStat } from "@/components/layout/header-context";

import { COLLEGE_BILLING_HREF } from "./components/college-error-state";

interface SeatCounts {
  allocated: number;
  used: number;
  subscriptionActive: boolean;
}

/**
 * The seat chip in the college header. Without a subscription there are no
 * seats to count, so it says so rather than showing "0 of 0".
 */
export function seatStat(
  seats: SeatCounts | null | undefined,
  isLoading: boolean,
): HeaderStat {
  if (!isLoading && seats && !seats.subscriptionActive) {
    return {
      icon: Armchair,
      label: "No subscription",
      warning: true,
      href: COLLEGE_BILLING_HREF,
    };
  }

  return {
    icon: Armchair,
    label: seats ? `${seats.used} of ${seats.allocated} seats used` : "Seats",
    progress:
      seats && seats.allocated > 0 ? (seats.used / seats.allocated) * 100 : 0,
    href: COLLEGE_BILLING_HREF,
    isLoading,
  };
}
