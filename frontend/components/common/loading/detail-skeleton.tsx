import { Skeleton, SkeletonText } from "./skeleton";

export interface DetailSkeletonProps {
  /** Number of content section blocks below the header. */
  sections?: number;
  /** Show trailing action-button placeholders in the header. */
  actions?: boolean;
  className?: string;
}

/**
 * Structured placeholder for a multi-section detail page (job, application,
 * candidate, student, subscription). Header + metadata + content sections,
 * so the loading state resembles the eventual page rather than a lone spinner.
 */
export function DetailSkeleton({
  sections = 2,
  actions = true,
  className = "",
}: DetailSkeletonProps) {
  return (
    <div
      className={`grid gap-5 ${className}`}
      role="status"
      aria-busy="true"
      style={{ fontFamily: "'General Sans', sans-serif" }}
    >
      <span className="sr-only">Loading…</span>

      {/* Header: title + meta on the left, actions on the right */}
      <div className="rounded-2xl border border-[#e7e9ee] bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Skeleton width="40%" height={20} radius={8} />
            <div className="mt-3 flex flex-wrap gap-3">
              <Skeleton width={96} height={12} radius={6} />
              <Skeleton width={120} height={12} radius={6} />
              <Skeleton width={80} height={12} radius={6} />
            </div>
          </div>
          {actions && (
            <div className="flex shrink-0 gap-2">
              <Skeleton width={96} height={36} radius={10} />
              <Skeleton width={112} height={36} radius={10} />
            </div>
          )}
        </div>
      </div>

      {/* Content sections */}
      {Array.from({ length: sections }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-[#e7e9ee] bg-white p-5"
        >
          <Skeleton width={160} height={13} radius={6} />
          <SkeletonText className="mt-4" lines={4} lastLineWidth="45%" />
        </div>
      ))}
    </div>
  );
}
