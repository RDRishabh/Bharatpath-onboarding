import { Loader2 } from "lucide-react";

interface LoaderProps {
  label?: string;
  size?: number;
  className?: string;
}

/** Matches the animated loader used by the Jobs table. */
export function Loader({
  label,
  size = 20,
  className = "",
}: LoaderProps) {
  return (
    <div
      className={`flex items-center gap-2 text-xs text-[#718096] ${className}`}
      role="status"
      aria-live="polite"
    >
      <Loader2
        aria-hidden="true"
        size={size}
        strokeWidth={2}
        className="animate-spin text-[#777f90]"
      />
      {label && <span>{label}</span>}
    </div>
  );
}
