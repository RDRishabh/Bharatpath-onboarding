"use client";

const platformControls = [
  {
    label: "Credit price per unlock",
    detail:
      "Applies to every employer account",
    value: "1 credit",
  },
  {
    label: "Candidate masking",
    detail:
      "Identity hidden until an unlock is recorded",
    value: "Enforced",
  },
  {
    label: "Audit retention",
    detail:
      "Immutable operator action log",
    value: "7 years",
  },
] as const;

export function PlatformTab() {
  return (
    <section
      className="mt-4 flex max-w-[640px] flex-col gap-4 rounded-[12px] border border-[#e5e8ee] bg-white p-5"
      style={{
        boxShadow:
          "0 4px 12px rgba(19, 26, 38, 0.024)",
      }}
    >
      {/* ============================================================
          HEADER
          ============================================================ */}

      <span className="flex flex-col gap-1">
        <span className="text-[14px] font-semibold leading-[18px] text-[#172033]">
          Platform controls
        </span>

        <span className="text-[12px] font-normal leading-[17px] text-[#7b8494]">
          Applies across every employer,
          candidate and institution account.
        </span>
      </span>

      {/* ============================================================
          CONTROLS
          ============================================================ */}

      <div className="flex flex-col">
        {platformControls.map(
          (control) => (
            <div
              key={control.label}
              className="flex items-center gap-3 border-t border-[#eef0f3] py-3"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-semibold leading-[17px] text-[#172033]">
                  {control.label}
                </span>

                <span className="text-[11px] font-normal leading-[14px] text-[#7b8494]">
                  {control.detail}
                </span>
              </span>

              <span className="shrink-0 whitespace-nowrap rounded-full bg-[#f0f2f5] px-2.5 py-1 text-[11px] font-semibold leading-[14px] text-[#172033]">
                {control.value}
              </span>
            </div>
          ),
        )}
      </div>
    </section>
  );
}