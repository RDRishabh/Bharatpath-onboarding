import { Spinner } from "./spinner";

export interface PageLoaderProps {
  /** Status text under the spinner. */
  label?: string;
  /** Minimum height of the centred area. Defaults to a comfortable panel. */
  minHeight?: number | string;
  className?: string;
}

/**
 * Centred animated loader for full-area waits where there is no meaningful
 * layout to skeletonise (e.g. an interstitial while resolving a route).
 * Prefer a structured skeleton whenever the eventual layout is known.
 */
export function PageLoader({
  label = "Loading…",
  minHeight = 320,
  className = "",
}: PageLoaderProps) {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center gap-3 ${className}`}
      style={{
        minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight,
        fontFamily: "'General Sans', sans-serif",
      }}
    >
      <Spinner size={26} />
      {label && (
        <p className="text-[13px] font-medium text-[#777f90]">{label}</p>
      )}
    </div>
  );
}
