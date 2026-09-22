"use client";

import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Rocket,
  Briefcase,
  ArrowRight,
} from "lucide-react";

import {
  studentProfile,
  studentScore,
  jobListings,
  addOnCards,
} from "@/features/student/data";
import {
  JobCard,
  SectionEyebrow,
  CommerceBadge,
} from "@/features/student/components";
import { BandStrip } from "@/features/student/components/score-ring";
import { StudentPage } from "@/features/student/shell";

/*
 * ==========================================================================
 * HOME — the primary hub. Greeting, the score card, the two add-ons, and the
 * first jobs the candidate qualifies for. Responsive: single column on mobile,
 * a two-column split (score + add-ons) and a job grid on larger screens.
 * ==========================================================================
 */

export function StudentHome() {
  const router = useRouter();

  const qualifyingJobs = jobListings
    .filter((job) => job.match === "match")
    .slice(0, 3);

  return (
    <StudentPage>
      <div className="flex flex-col gap-6">
        {/* Greeting */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] leading-4 text-[#5F6B80]">
            Wednesday, 12 Aug
          </span>
          <span className="text-[26px] font-bold leading-8 tracking-[-0.025em] text-[#0A1931] sm:text-[30px]">
            Hi, {studentProfile.greetingName}
          </span>
        </div>

        {/* Score + add-ons */}
        <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          {/* Score card */}
          <button
            type="button"
            onClick={() => router.push("/student/score")}
            className="relative flex flex-col gap-4 overflow-hidden rounded-[24px] bg-[#5F4DB2] p-5 text-left transition-transform active:scale-[.99] sm:p-6"
          >
            <span className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase leading-3 tracking-[0.14em] text-[#E0DBF4]">
                Your resume score
              </span>
              <ChevronRight size={16} className="text-white" />
            </span>

            <span className="flex items-baseline gap-2">
              <span className="text-[52px] font-extrabold leading-none tracking-[-0.045em] text-white sm:text-[64px]">
                {studentScore.value}
              </span>
              <span className="text-[13px] text-[#E0DBF4]">/ {studentScore.max}</span>
              <span className="text-[15px] font-bold text-[#F4D685]">
                +{studentScore.delta}
              </span>
            </span>

            <span className="flex flex-col gap-2">
              <BandStrip band={studentScore.band} />
              <span className="flex items-center justify-between text-[12px] leading-4 text-[#E0DBF4]">
                <span>Employers filter by band</span>
                <span className="font-medium text-[#F4D685]">
                  {studentScore.toNextBand} to {studentScore.nextBandLabel}
                </span>
              </span>
            </span>
          </button>

          {/* Go further */}
          <div className="flex flex-col gap-3">
            <SectionEyebrow icon={<Rocket size={12} />}>Go further</SectionEyebrow>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              {addOnCards.map((addon) => (
                <button
                  key={addon.id}
                  type="button"
                  onClick={() =>
                    router.push(
                      addon.key === "attribute"
                        ? "/student/attribute"
                        : "/student/interview",
                    )
                  }
                  className="flex flex-col gap-3 overflow-hidden rounded-[20px] border p-3 text-left transition-transform active:scale-[.98]"
                  style={{ background: addon.tint, borderColor: addon.border }}
                >
                  <span className="flex items-start justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/70 text-[#4A3E8F]">
                      <Rocket size={16} />
                    </span>
                    <CommerceBadge>
                      {addon.isFree ? "Free" : addon.priceLabel}
                    </CommerceBadge>
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-bold leading-5 tracking-[-0.02em] text-[#0A1931]">
                      {addon.title}
                    </span>
                    <span className="text-[12px] leading-4 text-[#3A4761]">
                      {addon.subtitle}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Jobs you qualify for */}
        <div className="flex flex-col gap-3">
          <SectionEyebrow
            icon={<Briefcase size={12} />}
            action={
              <button
                type="button"
                onClick={() => router.push("/student/jobs")}
                className="flex items-center gap-1 text-[13px] font-semibold text-[#0A1931]"
              >
                All 28
                <ChevronRight size={12} />
              </button>
            }
          >
            Jobs you qualify for
          </SectionEyebrow>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {qualifyingJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>

          <button
            type="button"
            onClick={() => router.push("/student/jobs")}
            className="flex items-center justify-center gap-2 self-start rounded-full border border-[#DDD6C7] bg-white px-5 py-3 text-[14px] font-semibold text-[#0A1931] transition-transform active:scale-[.98]"
          >
            See all jobs
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </StudentPage>
  );
}
