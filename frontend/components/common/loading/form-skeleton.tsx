import { Skeleton } from "./skeleton";

export interface FormSkeletonProps {
  /** Number of field placeholders. */
  fields?: number;
  /** Show a submit-button placeholder at the end. */
  actions?: boolean;
  /** Wrap in a bordered card. */
  bordered?: boolean;
  className?: string;
}

/**
 * Placeholder for a form that is loading its initial data (settings, KYB,
 * profile, job edit). Each field is a label + input outline.
 */
export function FormSkeleton({
  fields = 4,
  actions = true,
  bordered = true,
  className = "",
}: FormSkeletonProps) {
  return (
    <div
      className={`${
        bordered
          ? "rounded-2xl border border-[#e7e9ee] bg-white p-5"
          : ""
      } ${className}`}
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading form…</span>
      <div className="grid gap-5">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="grid gap-2">
            <Skeleton width={120} height={10} radius={6} />
            <Skeleton width="100%" height={40} radius={10} />
          </div>
        ))}
      </div>
      {actions && (
        <div className="mt-6 flex justify-end">
          <Skeleton width={132} height={36} radius={10} />
        </div>
      )}
    </div>
  );
}
