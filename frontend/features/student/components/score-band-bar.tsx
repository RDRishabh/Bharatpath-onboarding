import { bandIndex, bandLabel } from "@/features/student/formatters";
import type { ScoreScale } from "@/features/student/types";

/*
 * ==========================================================================
 * SCORE BAND BAR
 *
 * One segment per band from `GET /candidate/score/scale`: the count, the
 * order, the names and the ranges are all the backend's. Segments up to and
 * including the candidate's band are gold. Deliberately a flat strip, never a
 * red-to-green gauge (design-system §1).
 *
 * It shows where a candidate stands and nothing more: no distance to the next
 * band, no points gained. Both are an explanation of the score, which the
 * candidate is never given.
 * ==========================================================================
 */

export function ScoreBandBar({
  scale,
  band,
  value,
  onNavy = true,
  showLabels = false,
}: {
  scale: ScoreScale;
  band: string | null | undefined;
  value?: number | null;
  onNavy?: boolean;
  showLabels?: boolean;
}) {
  const current = bandIndex(scale, band, value);
  const summary =
    current >= 0
      ? `${bandLabel(scale.bands[current].band)} band, ${current + 1} of ${scale.bands.length}`
      : `${scale.bands.length} bands`;

  return (
    <span role="img" aria-label={summary} className="flex w-full flex-col gap-2">
      <span
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${scale.bands.length}, minmax(0, 1fr))`,
        }}
      >
        {scale.bands.map((range, index) => (
          <span
            key={range.band}
            className="h-[6px] rounded-full"
            style={{
              background:
                index <= current
                  ? "#F4D685"
                  : onNavy
                    ? "rgba(255,252,247,0.18)"
                    : "#F0EBDF",
            }}
          />
        ))}
      </span>

      {showLabels ? (
        <span
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${scale.bands.length}, minmax(0, 1fr))`,
          }}
          aria-hidden="true"
        >
          {scale.bands.map((range, index) => (
            <span key={range.band} className="flex min-w-0 flex-col">
              <span
                className={[
                  "truncate text-[11px] font-semibold",
                  index === current
                    ? onNavy
                      ? "text-[#F4D685]"
                      : "text-[#0A1931]"
                    : onNavy
                      ? "text-[#E0DBF4]"
                      : "text-[#5F6B80]",
                ].join(" ")}
              >
                {bandLabel(range.band)}
              </span>
              <span
                className={[
                  "truncate text-[10px] tabular-nums",
                  onNavy ? "text-[#C9C1EA]" : "text-[#5F6B80]",
                ].join(" ")}
              >
                {range.lowest}–{range.highest}
              </span>
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}

/** Shown in place of the band bar until `GET /candidate/score/scale` answers. */
export function ScoreScaleUnavailable({
  message,
  onRetry,
  onNavy = true,
}: {
  message: string;
  onRetry?: () => void;
  onNavy?: boolean;
}) {
  return (
    <span
      role="status"
      className={[
        "flex w-full flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-[12px]",
        onNavy ? "bg-white/10 text-[#E0DBF4]" : "bg-[#F7F4EC] text-[#5F6B80]",
      ].join(" ")}
    >
      <span>Band scale unavailable. {message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={[
            "rounded-full px-3 py-1 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2",
            onNavy
              ? "bg-white/15 text-white hover:bg-white/25 focus-visible:ring-white/40"
              : "bg-white text-[#0A1931] hover:bg-[#F0EBDF] focus-visible:ring-[#5F4DB2]/30",
          ].join(" ")}
        >
          Retry
        </button>
      ) : null}
    </span>
  );
}
