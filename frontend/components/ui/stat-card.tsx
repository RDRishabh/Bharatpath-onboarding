import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export interface StatCardProps {
  value: string | number;
  label: string;
  delta?: number;
  deltaLabel?: string;
  className?: string;
}

export function StatCard({
  value,
  label,
  delta,
  deltaLabel,
  className = "",
}: StatCardProps) {
  const hasDelta = typeof delta === "number";
  const isPositive = (delta ?? 0) >= 0;

  return (
    <div
      className={`rounded-[16px] border border-[#e7e9ee] bg-white px-5 py-4 ${className}`}
      style={{ fontFamily: "'General Sans', sans-serif" }}
    >
      <p className="text-[28px] font-bold leading-[34px] tracking-[-0.02em] text-[#151b2b]">
        {value}
      </p>

      <p className="mt-1 text-[13px] font-medium leading-[18px] text-[#5d6673]">
        {label}
      </p>

      {hasDelta && (
        <p
          className={`mt-3 inline-flex items-center gap-1 text-[12px] font-semibold ${
            isPositive ? "text-[#23805d]" : "text-[#a16207]"
          }`}
        >
          {isPositive ? (
            <ArrowUpRight size={14} strokeWidth={2.2} />
          ) : (
            <ArrowDownRight size={14} strokeWidth={2.2} />
          )}
          <span>
            {isPositive ? "+" : ""}
            {delta}
            {deltaLabel ? ` ${deltaLabel}` : ""}
          </span>
        </p>
      )}
    </div>
  );
}
