"use client";

import { CircleAlert } from "lucide-react";

import type {
  KybMode,
  AutomaticCheckKey,
} from "../types";

import { AutomaticChecks } from "./automatic-checks";

interface KybApprovalTabProps {
  kybMode: KybMode;
  autoChecks: Record<
    AutomaticCheckKey,
    boolean
  >;
  onKybModeChange: (
    mode: KybMode,
  ) => void;
  onToggleCheck: (
    check: AutomaticCheckKey,
  ) => void;
}

const approvalOptions: Array<{
  key: KybMode;
  label: string;
  description: string;
}> = [
  {
    key: "manual",
    label: "Manual approval",
    description:
      "Every employer waits for an operator decision before becoming fully active. Slower, but nothing clears unreviewed.",
  },
  {
    key: "auto",
    label: "Automatic approval",
    description:
      "Employers clear automatically once the enabled verification checks pass. Only exceptions reach the queue.",
  },
];

export function KybApprovalTab({
  kybMode,
  autoChecks,
  onKybModeChange,
  onToggleCheck,
}: KybApprovalTabProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,348px)]">
      {/* ============================================================
          APPROVAL MODE
          ============================================================ */}

      <section className="min-w-0 rounded-[12px] border border-[#e5e8ee] bg-white p-5">
        <h2 className="text-[14px] font-semibold leading-[18px] text-[#172033]">
          Employer KYB approval mode
        </h2>

        <p className="mt-1 max-w-[530px] text-[12px] leading-[17px] text-[#7b8494]">
          Controls whether an employer needs an
          operator decision before becoming fully
          active. Employers can always enter the
          portal after onboarding — this gates
          operational functionality.
        </p>

        {/* Approval options */}

        <div className="mt-4 space-y-2.5">
          {approvalOptions.map((option) => {
            const active =
              kybMode === option.key;

            return (
              <button
                key={option.key}
                type="button"
                onClick={() =>
                  onKybModeChange(option.key)
                }
                className={[
                  "flex w-full cursor-pointer items-start gap-3 rounded-[12px] border p-4 text-left transition-colors",
                  active
                    ? "border-[#6557e5] bg-[#f7f5ff]"
                    : "border-[#e5e8ee] bg-white hover:bg-[#fafbfc]",
                ].join(" ")}
              >
                {/* Radio */}

                <span
                  className={[
                    "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                    active
                      ? "border-[#6557e5]"
                      : "border-[#d9dee6]",
                  ].join(" ")}
                >
                  {active && (
                    <span className="h-2.5 w-2.5 rounded-full bg-[#6557e5]" />
                  )}
                </span>

                {/* Content */}

                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold text-[#172033]">
                      {option.label}
                    </span>

                    {active && (
                      <span className="shrink-0 rounded-full bg-[#6255d8] px-2.5 py-1 text-[10px] font-bold uppercase text-white">
                        Current
                      </span>
                    )}
                  </span>

                  <span className="mt-1 block max-w-[440px] text-[11px] leading-[17px] text-[#7b8494]">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Warning */}

        <div className="mt-4 flex gap-2.5 rounded-[10px] bg-[#fff5df] p-3.5">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#b17a19]" />

          <p className="text-[11px] leading-[17px] text-[#9a6c19]">
            {kybMode === "auto"
              ? "Automatic approval is live. Spot-check the audit trail weekly."
              : "Manual approval is live. Employers stay gated until an operator decides, so KYB backlog directly delays their hiring."}
          </p>
        </div>
      </section>

      {/* ============================================================
          AUTOMATIC CHECKS
          ============================================================ */}

      <AutomaticChecks
        checks={autoChecks}
        onToggle={onToggleCheck}
      />
    </div>
  );
}