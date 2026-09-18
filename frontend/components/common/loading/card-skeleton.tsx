import { Skeleton } from "./skeleton";

export interface CardSkeletonProps {
  /** Show the small icon square (metric/stat cards). */
  icon?: boolean;
  /** Show a status pill placeholder beneath the label. */
  status?: boolean;
  className?: string;
}

/**
 * Placeholder matching a metric / stat card (large value, label, optional
 * icon and status). Preserves the card footprint to avoid layout shift.
 */
export function CardSkeleton({
  icon = true,
  status = false,
  className = "",
}: CardSkeletonProps) {
  return (
    <div
      className={`rounded-2xl border border-[#e5e7ec] bg-white px-6 py-5 ${className}`}
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading…</span>
      <div className="flex items-start justify-between gap-4">
        <Skeleton width={72} height={30} radius={8} />
        {icon && <Skeleton width={32} height={32} radius={11} />}
      </div>
      <Skeleton className="mt-3" width="55%" height={11} radius={6} />
      {status && <Skeleton className="mt-3" width={84} height={20} radius={999} />}
    </div>
  );
}

export interface CardSkeletonGridProps {
  /** How many card placeholders to render. */
  count?: number;
  icon?: boolean;
  status?: boolean;
  className?: string;
}

/** A responsive row of card skeletons for dashboards / metric strips. */
export function CardSkeletonGrid({
  count = 4,
  icon = true,
  status = false,
  className = "",
}: CardSkeletonGridProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} icon={icon} status={status} />
      ))}
    </div>
  );
}
