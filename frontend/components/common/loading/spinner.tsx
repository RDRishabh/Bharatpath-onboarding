import { Loader2 } from "lucide-react";

export interface SpinnerProps {
  /** Optional status text shown next to the spinner. */
  label?: string;
  /** Icon size in px. */
  size?: number;
  /** Tone of the spinner + label. */
  tone?: "muted" | "primary" | "onDark";
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<SpinnerProps["tone"]>, string> = {
  muted: "text-[#777f90]",
  primary: "text-[#5b4fcf]",
  onDark: "text-white",
};

/**
 * The single animated spinner used everywhere a spinner (rather than a
 * skeleton) is appropriate. Accessible by default via role="status".
 */
export function Spinner({
  label,
  size = 20,
  tone = "muted",
  className = "",
}: SpinnerProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs ${TONE_CLASSES[tone]} ${className}`}
      role="status"
      aria-live="polite"
    >
      <Loader2
        aria-hidden="true"
        size={size}
        strokeWidth={2}
        className="animate-spin"
      />
      {label && <span>{label}</span>}
      {!label && <span className="sr-only">Loading</span>}
    </span>
  );
}
