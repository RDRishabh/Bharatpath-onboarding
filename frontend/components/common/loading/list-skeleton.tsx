import { Skeleton } from "./skeleton";

export interface ListSkeletonProps {
  /** Number of list rows. */
  rows?: number;
  /** Show a leading avatar/icon circle on each row. */
  avatar?: boolean;
  /** Show a trailing action/value placeholder. */
  trailing?: boolean;
  /** Wrap in a bordered card. */
  bordered?: boolean;
  className?: string;
}

/**
 * Placeholder for asynchronous lists (notifications, activity, jobs, etc.).
 * Each row echoes a title + subtitle with optional avatar and trailing meta.
 */
export function ListSkeleton({
  rows = 5,
  avatar = true,
  trailing = false,
  bordered = true,
  className = "",
}: ListSkeletonProps) {
  return (
    <div
      className={`${
        bordered
          ? "rounded-2xl border border-[#e7e9ee] bg-white"
          : ""
      } ${className}`}
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading list…</span>
      <div className="divide-y divide-[#f0f2f5]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5">
            {avatar && <Skeleton width={36} height={36} circle />}
            <div className="min-w-0 flex-1">
              <Skeleton width="45%" height={12} radius={6} />
              <Skeleton className="mt-2" width="70%" height={10} radius={6} />
            </div>
            {trailing && <Skeleton width={56} height={24} radius={8} />}
          </div>
        ))}
      </div>
    </div>
  );
}
