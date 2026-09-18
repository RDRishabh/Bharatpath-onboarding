import { Skeleton } from "./skeleton";

export interface TableSkeletonProps {
  /** Number of columns. If `widths` is given, its length wins. */
  columns?: number;
  /** Number of placeholder rows. */
  rows?: number;
  /** Optional per-column widths (CSS values), aligns the shimmer to layout. */
  widths?: string[];
  /** Tighter row height to match dense tables. */
  compact?: boolean;
  /** Render the header row. Defaults to true. */
  header?: boolean;
  className?: string;
}

/**
 * Skeleton that mirrors a data table: a header strip and evenly spaced rows.
 * Rendered inside a table's own card by callers, or standalone.
 */
export function TableSkeleton({
  columns = 5,
  rows = 6,
  widths,
  compact = false,
  header = true,
  className = "",
}: TableSkeletonProps) {
  const colCount = widths?.length ?? columns;
  const cols = Array.from({ length: colCount });
  const rowPadding = compact ? "py-2.5" : "py-3.5";
  const cellWidth = (index: number) =>
    widths?.[index] ?? (index === 0 ? "55%" : "70%");

  return (
    <div
      className={`w-full ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading table…</span>

      {header && (
        <div className="grid gap-4 border-b border-[#e7e9ee] bg-[#fafbfc] px-6 py-3.5">
          <div
            className="grid items-center gap-4"
            style={{
              gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
            }}
          >
            {cols.map((_, i) => (
              <Skeleton key={i} height={9} radius={4} width="45%" />
            ))}
          </div>
        </div>
      )}

      <div className="divide-y divide-[#f0f2f5]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className={`grid px-6 ${rowPadding}`}>
            <div
              className="grid items-center gap-4"
              style={{
                gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
              }}
            >
              {cols.map((_, c) => (
                <Skeleton key={c} height={12} radius={6} width={cellWidth(c)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
