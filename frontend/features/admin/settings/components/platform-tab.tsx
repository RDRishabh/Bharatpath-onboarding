"use client";

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
          Platform configuration is managed through deployment configuration.
        </span>
      </span>

      {/* ============================================================
          CONTROLS
          ============================================================ */}

      <p className="border-t border-[#eef0f3] pt-4 text-[12px] leading-[18px] text-[#7b8494]">
        The backend currently exposes no Admin endpoint for reading or updating global platform settings.
      </p>
    </section>
  );
}