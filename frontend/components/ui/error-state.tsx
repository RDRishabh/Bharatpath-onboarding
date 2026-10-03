"use client";

import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

import { getApiErrorMessage } from "@/lib/api/error-message";

export interface ErrorStateProps {
  /**
   * The raw error from RTK Query / a thrown request. When provided, a
   * consistent user-facing message is derived from it. Ignored when
   * `message` is passed.
   */
  error?: unknown;
  /** Explicit message, overriding whatever `error` would resolve to. */
  message?: string;
  /** Fallback copy when `error` cannot be mapped to something specific. */
  fallback?: string;
  /** Heading shown above the message in the `block` variant. */
  title?: string;
  /**
   * `inline` — a compact banner for in-context failures (default).
   * `block`  — a centred panel for whole-section load failures.
   */
  variant?: "inline" | "block";
  /** When provided, a "Try again" button is shown. */
  onRetry?: () => void;
  /** Extra call to action shown beside "Try again" in the `block` variant. */
  action?: ReactNode;
  className?: string;
}

/**
 * The single, consistent error surface for the app. Every API failure that is
 * shown to a user should render through this component so the styling, icon,
 * ARIA role and message derivation stay identical everywhere.
 */
export function ErrorState({
  error,
  message,
  fallback,
  title,
  variant = "inline",
  onRetry,
  action,
  className,
}: Readonly<ErrorStateProps>) {
  const text =
    message ?? getApiErrorMessage(error, fallback);

  if (variant === "block") {
    return (
      <div
        role="alert"
        className={[
          "flex flex-col items-center justify-center gap-2 rounded-xl",
          "border border-[#f0c8cc] bg-[#fff7f7] px-6 py-8 text-center",
          className ?? "",
        ].join(" ")}
      >
        <AlertCircle
          className="h-5 w-5 text-[#c52b2b]"
          aria-hidden="true"
        />

        {title && (
          <p className="text-[13px] font-semibold text-[#9f2432]">
            {title}
          </p>
        )}

        <p className="text-[12px] text-[#9f2432]">
          {text}
        </p>

        {(onRetry || action) && (
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="cursor-pointer rounded-lg border border-[#e0aeb4] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#9f2432] transition-colors hover:bg-[#fdeef0]"
              >
                Try again
              </button>
            )}
            {action}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={[
        "flex items-start gap-2 rounded-lg border border-[#f0c8cc]",
        "bg-[#fff7f7] p-3 text-[12px] text-[#9f2432]",
        className ?? "",
      ].join(" ")}
    >
      <AlertCircle
        className="mt-px h-4 w-4 shrink-0 text-[#c52b2b]"
        aria-hidden="true"
      />

      <span className="min-w-0 flex-1">{text}</span>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 cursor-pointer font-semibold underline underline-offset-2 hover:text-[#7f1d2a]"
        >
          Try again
        </button>
      )}
    </div>
  );
}
