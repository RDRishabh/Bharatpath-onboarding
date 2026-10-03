import type { DiscountAudience, DiscountCode } from "@/store/api/admin-api";

export const AUDIENCE_LABEL: Record<DiscountAudience, string> = {
  CANDIDATE: "Candidates",
  EMPLOYER: "Employers",
  COLLEGE: "Colleges",
};

export const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);

export const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export function valueLabel(code: DiscountCode) {
  return code.percent_off ? `${code.percent_off}% off` : `${money(code.amount_off_minor ?? 0)} off`;
}
