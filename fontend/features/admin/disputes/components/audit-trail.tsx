"use client";

import {
  CheckCircle2,
  FileText,
  Gavel,
  ToggleLeft,
  TriangleAlert,
} from "lucide-react";

import type {
  AuditIcon,
  AuditItem,
} from "../types";

interface AuditTrailProps {
  items: AuditItem[];
}

function AuditIconComponent({
  icon,
}: {
  icon: AuditIcon;
}) {
  switch (icon) {
    case "file":
      return (
        <FileText
          className="h-[14px] w-[14px] text-[#385da8]"
          strokeWidth={2}
        />
      );

    case "alert":
      return (
        <TriangleAlert
          className="h-[14px] w-[14px] text-[#385da8]"
          strokeWidth={2}
        />
      );

    case "toggle":
      return (
        <ToggleLeft
          className="h-[14px] w-[14px] text-[#385da8]"
          strokeWidth={2}
        />
      );

    case "gavel":
      return (
        <Gavel
          className="h-[14px] w-[14px] text-[#385da8]"
          strokeWidth={2}
        />
      );

    case "check":
    default:
      return (
        <CheckCircle2
          className="h-[14px] w-[14px] text-[#385da8]"
          strokeWidth={2}
        />
      );
  }
}

export function AuditTrail({
  items,
}: AuditTrailProps) {
  return (
    <section
      className="flex h-fit flex-col gap-4 rounded-[12px] border border-[#e5e8ee] bg-white p-5"
      style={{
        boxShadow:
          "0 4px 12px rgba(19, 26, 38, 0.024)",
      }}
    >
      {/* Header */}

      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-semibold leading-[18px] text-[#172033]">
          Audit trail
        </span>

        <button
          type="button"
          className="cursor-pointer text-[12px] font-semibold leading-4 text-[#385da8]"
        >
          Export
        </button>
      </div>

      {/* Timeline */}

      <div className="relative pb-3">
        <span className="absolute bottom-0 left-[13px] top-7 w-[2px] bg-[#eef0f3]" />

        <div className="flex flex-col">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 pt-3.5"
            >
              {/* Timeline icon */}

              <span className="relative z-[1] grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-[#eef0f3] bg-white">
                <AuditIconComponent
                  icon={item.icon}
                />
              </span>

              {/* Content */}

              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-normal leading-[18px] text-[#687182] [text-wrap:pretty]">
                  {item.description}
                </span>

                <span className="flex flex-wrap items-center gap-2">
                  <span className="whitespace-nowrap rounded-full bg-[#f0f2f5] px-2.5 py-1 text-[11px] font-semibold leading-[14px] text-[#172033]">
                    {item.operator}
                  </span>

                  <span className="text-[11px] font-medium leading-[14px] text-[#7b8494]">
                    {item.timestamp}
                  </span>
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}

      <span className="border-t border-[#eef0f3] pt-3 text-[12px] font-normal leading-[17px] text-[#7b8494]">
        Audit records are immutable and retained
        for 7 years.
      </span>
    </section>
  );
}