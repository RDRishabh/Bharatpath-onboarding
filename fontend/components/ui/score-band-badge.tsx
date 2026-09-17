import React from "react";

export type ScoreBandType = "exceptional" | "strong" | "building" | "not_scored";

interface ScoreBandConfig {
  label: string;
  className: string;
}

const SCORE_BAND_CONFIGS: Record<ScoreBandType, ScoreBandConfig> = {
  exceptional: {
    label: "Exceptional",
    className: "bg-[#131a26] text-white",
  },
  strong: {
    label: "Strong",
    className: "bg-[#eaf5ef] text-[#23805d]",
  },
  building: {
    label: "Building",
    className: "bg-[#eef1f6] text-[#4f5869]",
  },
  not_scored: {
    label: "Not scored",
    className: "bg-[#f0f2f5] text-[#717a8a]",
  },
};

export interface ScoreBandBadgeProps {
  band?: ScoreBandType | string;
  className?: string;
}

export function ScoreBandBadge({
  band = "not_scored",
  className = "",
}: ScoreBandBadgeProps) {
  const normalizedKey = (band?.toLowerCase().replace(/\s+/g, "_") as ScoreBandType) || "not_scored";
  const config = SCORE_BAND_CONFIGS[normalizedKey] || SCORE_BAND_CONFIGS.not_scored;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-0.5 text-[12px] font-semibold leading-tight select-none ${config.className} ${className}`}
      style={{ fontFamily: "'General Sans', sans-serif" }}
    >
      {config.label}
    </span>
  );
}
