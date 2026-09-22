"use client";

import { useRouter } from "next/navigation";
import { Share2, ShieldCheck, ChevronRight } from "lucide-react";

import { studentScore } from "@/features/student/data";
import {
  IconCircleButton,
  MeterBar,
  PillButton,
} from "@/features/student/components";
import { ScoreRing, BandStrip } from "@/features/student/components/score-ring";
import { StudentTopBar, StudentPage } from "@/features/student/shell";

/*
 * ==========================================================================
 * SCORE REVEAL — the trust moment. The gold ring that draws and counts up, the
 * band position, then the first three of five categories. Responsive: the ring
 * hero and the breakdown sit side by side on large screens.
 * The number is never drawn as a red-to-green gauge (design-system §1).
 * ==========================================================================
 */

export function ScoreReveal() {
  const router = useRouter();
  const topThree = studentScore.categories.slice(0, 3);

  return (
    <StudentPage width="medium">
      <StudentTopBar
        title="Your resume score"
        right={
          <IconCircleButton aria-label="Share your result">
            <Share2 size={16} />
          </IconCircleButton>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Navy hero */}
        <div className="flex flex-col items-center gap-4 rounded-[24px] bg-[#5F4DB2] p-6">
          <ScoreRing value={studentScore.value} max={studentScore.max} />

          <div className="flex w-full flex-col gap-2.5">
            <div className="flex items-center justify-center gap-2 pb-1">
              <ShieldCheck size={15} className="text-[#F4D685]" />
              <span className="text-[12px] text-[#E0DBF4]">
                +{studentScore.delta} since your last resume
              </span>
            </div>
            <BandStrip band={studentScore.band} />
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[11px] text-[#9DA9BE]">
                Band {studentScore.band} of {studentScore.bandCount} · {studentScore.bandLabel}
              </span>
              <span className="text-[12px] font-medium text-[#F4D685]">
                {studentScore.toNextBand} to {studentScore.nextBandLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[11px] font-bold uppercase leading-[14px] tracking-[0.12em] text-[#5F6B80]">
              Where your points come from
            </span>
            <span className="text-[11px] leading-[14px] text-[#5F6B80]">3 of 5</span>
          </div>

          <div className="rounded-[20px] border border-[#E7E0D4] bg-white px-4">
            {topThree.map((category, index) => (
              <div
                key={category.key}
                className={[
                  "flex flex-col gap-2.5 py-3",
                  index < topThree.length - 1 ? "border-b border-[#F0EBDF]" : "",
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-[14px] font-medium text-[#0A1931]">
                    {category.label}
                  </span>
                  <span className="text-[13px] font-bold text-[#0A1931]">
                    {category.value}
                    <span className="font-normal text-[#5F6B80]">/100</span>
                  </span>
                </div>
                <MeterBar value={category.value} emphasis={category.emphasis === "weak" ? "weak" : "strong"} />
              </div>
            ))}

            <button
              type="button"
              onClick={() => router.push("/student/score/breakdown")}
              className="flex w-full items-center gap-2 border-t border-[#F0EBDF] py-3 text-left transition-opacity active:opacity-60"
            >
              <span className="flex-1 text-[14px] font-semibold text-[#0A1931]">
                See all five categories
              </span>
              <ChevronRight size={16} className="text-[#6E7889]" />
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-col gap-2 sm:max-w-md sm:flex-row">
        <PillButton
          variant="secondary"
          className="flex-1"
          onClick={() => router.push("/student")}
        >
          Save
        </PillButton>
        <PillButton
          className="flex-[1.5]"
          onClick={() => router.push("/student/score/improve")}
        >
          Raise my score
        </PillButton>
      </div>
    </StudentPage>
  );
}
