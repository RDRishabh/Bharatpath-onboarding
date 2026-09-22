"use client";

import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Wrench,
  Briefcase,
  FlaskConical,
  CaseSensitive,
  Plus,
  type LucideIcon,
} from "lucide-react";

import { studentScore } from "@/features/student/data";
import { StudentTopBar, StudentPage } from "@/features/student/shell";

/*
 * ==========================================================================
 * SCORE BREAKDOWN — every point, explained. The same five categories for
 * everyone, no manual changes. Each category shows a meter, a plain-language
 * note, and (where useful) the fix that raises it.
 * ==========================================================================
 */

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  education: GraduationCap,
  skills: Wrench,
  experience: Briefcase,
  projects: FlaskConical,
  presentation: CaseSensitive,
};

export function ScoreBreakdown() {
  const router = useRouter();

  return (
    <StudentPage width="medium">
      <StudentTopBar title="Score breakdown" />

      <div className="mb-5 flex flex-col gap-0.5">
        <h1 className="text-[26px] font-bold leading-[30px] tracking-[-0.025em] text-[#0A1931]">
          Every point, explained
        </h1>
        <p className="text-[14px] leading-5 text-[#3A4761]">
          Same five categories for everyone. No manual changes.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {studentScore.categories.map((category) => {
        const Icon = CATEGORY_ICONS[category.key] ?? GraduationCap;
        const strong = category.emphasis === "strong";
        return (
          <div
            key={category.key}
            className="flex flex-col gap-3 rounded-[20px] border border-[#E7E0D4] bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <Icon
                size={20}
                className={strong ? "text-[#5E4DB2]" : "text-[#0A1931]"}
              />
              <span className="flex-1 text-[17px] font-bold leading-5 tracking-[-0.02em] text-[#0A1931]">
                {category.label}
              </span>
              <span
                className={[
                  "text-[15px] font-bold leading-5",
                  strong ? "text-[#5E4DB2]" : "text-[#0A1931]",
                ].join(" ")}
              >
                {category.value}/100
              </span>
            </div>

            <span className="h-2 overflow-hidden rounded-full bg-[rgba(94,77,178,0.16)]">
              <span
                className="block h-full rounded-full bg-[#5F4DB2]"
                style={{ width: `${category.value}%` }}
              />
            </span>

            <span className="text-[13px] leading-[18px] text-[#3A4761]">
              {category.note}
            </span>

            {category.fix ? (
              <button
                type="button"
                onClick={() => router.push("/student/score/improve")}
                className="flex w-full items-center justify-between gap-2 rounded-full border border-[#0A1931] bg-white px-3.5 py-3 transition-transform active:scale-[.99]"
              >
                <span className="flex items-center gap-2 text-[14px] font-semibold text-[#0A1931]">
                  <Plus size={13} />
                  {category.fix.label}
                </span>
                <span className="text-[12px] font-bold text-[#0A1931]">
                  +{category.fix.points}
                </span>
              </button>
            ) : null}
          </div>
        );
        })}
      </div>

      <span className="mt-4 block text-center text-[12px] leading-4 text-[#5F6B80]">
        Add-ons never change these five numbers
      </span>
    </StudentPage>
  );
}
