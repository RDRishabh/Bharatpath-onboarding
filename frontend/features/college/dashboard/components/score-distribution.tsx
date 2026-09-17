import { ScoreBand } from "../types";

interface ScoreDistributionProps {
  bands: ScoreBand[];
  averageScore: number;
  cohort?: string;
}

const barColors = [
  "bg-[#8b7ef0]",
  "bg-[#1f8a4c]",
  "bg-[#151b2b]",
];

const MAX_BAR_HEIGHT = 96;

export function ScoreDistribution({
  bands,
  averageScore,
  cohort = "2025-26",
}: ScoreDistributionProps) {
  const totalConsenting = bands.reduce(
    (sum, band) => sum + band.count,
    0,
  );

  const maxCount = Math.max(
    ...bands.map((band) => band.count),
    1,
  );

  return (
    <div className="rounded-xl border border-[#e5e7ec] bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#252b3b]">
            Cohort score distribution
          </h2>

          <p className="mt-1 text-xs text-[#8a91a0]">
            {totalConsenting} consenting students ·
            cohort {cohort}
          </p>
        </div>

        <span className="text-xl font-semibold text-[#151b2b]">
          {averageScore}{" "}
          <span className="text-xs font-normal text-[#8a91a0]">
            avg
          </span>
        </span>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        {bands.map((band, index) => {
          const barHeight = Math.max(
            4,
            Math.round(
              (band.count / maxCount) *
                MAX_BAR_HEIGHT,
            ),
          );

          return (
            <div key={band.label}>
              <p className="text-lg font-semibold text-[#151b2b]">
                {band.count}
              </p>

              <div
                className="mt-3 flex items-end"
                style={{ height: MAX_BAR_HEIGHT }}
              >
                <div
                  className={`w-full rounded-t-sm ${
                    barColors[
                      index % barColors.length
                    ]
                  }`}
                  style={{ height: barHeight }}
                />
              </div>

              <p className="mt-3 text-sm font-semibold text-[#252b3b]">
                {band.label}
              </p>

              <p className="mt-0.5 text-xs text-[#8a91a0]">
                {band.range}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-[#8a91a0]">
        Scores refresh nightly. Only students who
        consented to share are counted.
      </p>
    </div>
  );
}
