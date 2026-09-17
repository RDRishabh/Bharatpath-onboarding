"use client";

import type { ReactNode } from "react";

export interface DemoStateOption {
  id: string;
  label: string;
  active?: boolean;
  onClick: () => void;
  icon?: ReactNode;
}

type DemoStateVariant = "portal" | "employer";

interface DemoStatePanelProps {
  options: DemoStateOption[];
  label?: string;
  variant?: DemoStateVariant;
}

export function DemoStatePanel({
  options,
  label = "Queue load",
  variant = "portal",
}: DemoStatePanelProps) {
  const isEmployer = variant === "employer";

  const colors = {
    background: isEmployer ? "#f7f8fa" : "#f4f7fb",
    border: isEmployer ? "#e1e5eb" : "#dce5f0",
    simulate: isEmployer ? "#617087" : "#526b8a",
    label: isEmployer ? "#52627a" : "#3f5f82",
    activeBackground: isEmployer ? "#151b2b" : "#e8f0ff",
    activeText: isEmployer ? "#ffffff" : "#1f5fae",
    activeBorder: isEmployer ? "#151b2b" : "#2868c7",
    inactiveBackground: "#ffffff",
    inactiveText: isEmployer ? "#52627a" : "#3f5f82",
    inactiveBorder: isEmployer ? "#e1e5eb" : "#d8e1ec",
    inactiveHover: isEmployer ? "#f1f4f8" : "#eef4fb",
  };

  return (
    <div
      className="
        flex
        w-full
        shrink-0
        items-center
        gap-[20px]
        overflow-x-auto
        border-b
        px-[32px]
        py-[12px]
      "
      style={{
        backgroundColor: colors.background,
        borderColor: colors.border,
        fontFamily: "'General Sans', sans-serif",
      }}
    >
      {/* ==========================================
          SIMULATE
          ========================================== */}

      <span
        className="
          shrink-0
          whitespace-nowrap
          text-[10px]
          font-[700]
          leading-[13px]
          uppercase
          tracking-[0.14em]
        "
        style={{
          color: colors.simulate,
          fontFamily: "'General Sans', sans-serif",
          fontWeight: 700,
        }}
      >
        SIMULATE ▸
      </span>

      {/* ==========================================
          STATE GROUP
          ========================================== */}

      <div className="flex shrink-0 items-center gap-[6px]">
        {/* Label */}

        <span
          className="
            whitespace-nowrap
            text-[12px]
            font-[500]
            leading-[16px]
          "
          style={{
            color: colors.label,
            fontFamily: "'General Sans', sans-serif",
            fontWeight: 500,
          }}
        >
          {label}:
        </span>

        {/* Options */}

        <div className="flex items-center gap-[6px]">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={option.onClick}
              aria-pressed={option.active}
              className="
                inline-flex
                shrink-0
                items-center
                gap-[6px]
                rounded-[8px]
                border
                px-[12px]
                py-[6px]
                text-[11px]
                font-[600]
                leading-[14px]
                transition-colors
              "
              style={{
                fontFamily: "'General Sans', sans-serif",
                fontWeight: 600,
                backgroundColor: option.active
                  ? colors.activeBackground
                  : colors.inactiveBackground,
                color: option.active
                  ? colors.activeText
                  : colors.inactiveText,
                borderColor: option.active
                  ? colors.activeBorder
                  : colors.inactiveBorder,
              }}
              onMouseEnter={(event) => {
                if (!option.active) {
                  event.currentTarget.style.backgroundColor =
                    colors.inactiveHover;
                }
              }}
              onMouseLeave={(event) => {
                if (!option.active) {
                  event.currentTarget.style.backgroundColor =
                    colors.inactiveBackground;
                }
              }}
            >
              {option.icon && (
                <span className="shrink-0">
                  {option.icon}
                </span>
              )}

              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}