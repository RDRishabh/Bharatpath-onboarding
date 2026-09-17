"use client";

import type { AutomaticCheckKey } from "../types";

interface AutomaticChecksProps {
  checks: Record<
    AutomaticCheckKey,
    boolean
  >;
  onToggle: (
    check: AutomaticCheckKey,
  ) => void;
}

const automaticChecks: Array<{
  key: AutomaticCheckKey;
  label: string;
  detail: string;
}> = [
  {
    key: "gstin",
    label:
      "GSTIN active & matches entity",
    detail:
      "Live lookup against the GST registry",
  },
  {
    key: "pan",
    label:
      "PAN matches registered name",
    detail:
      "Name and entity-type comparison",
  },
  {
    key: "bank",
    label:
      "Bank account verification",
    detail:
      "Penny-drop to the submitted account",
  },
  {
    key: "address",
    label:
      "Registered address proof",
    detail:
      "Document match on the submitted address",
  },
];

export function AutomaticChecks({
  checks,
  onToggle,
}: AutomaticChecksProps) {
  return (
    <section className="min-w-0 rounded-[12px] border border-[#e5e8ee] bg-white p-5">
      <h2 className="text-[14px] font-semibold leading-[18px] text-[#172033]">
        Automatic checks
      </h2>

      <p className="mt-1 text-[12px] leading-[17px] text-[#7b8494]">
        Checks that must pass before automatic
        approval clears an employer.
      </p>

      <div className="mt-3 divide-y divide-[#eef0f3]">
        {automaticChecks.map((check) => {
          const enabled = Boolean(
            checks[check.key],
          );

          return (
            <div
              key={check.key}
              className="flex items-center gap-3 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-[18px] text-[#172033]">
                  {check.label}
                </p>

                <p className="mt-0.5 text-[11px] leading-[16px] text-[#7b8494]">
                  {check.detail}
                </p>
              </div>

              <button
                type="button"
                aria-label={`Toggle ${check.label}`}
                aria-pressed={enabled}
                onClick={() =>
                  onToggle(check.key)
                }
                className={[
                  "relative h-6 w-10 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors",
                  enabled
                    ? "bg-[#5b4fcf]"
                    : "bg-[#dfe3e8]",
                ].join(" ")}
              >
                <span
                  className={[
                    "block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                    enabled
                      ? "translate-x-4"
                      : "translate-x-0",
                  ].join(" ")}
                />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}