"use client";

import { useRouter } from "next/navigation";
import {
  Wrench,
  FlaskConical,
  CaseSensitive,
  Plus,
  type LucideIcon,
} from "lucide-react";

import {
  improvementFixes,
  totalImprovementPoints,
} from "@/features/student/data";
import { StudentTopBar, StudentPage } from "@/features/student/shell";
import { SkillChip, PillButton } from "@/features/student/components";

/*
 * ==========================================================================
 * SUGGESTIONS — three fixes, biggest first. Every claim is concrete and
 * counted ("about +58 points"), never "improve significantly".
 * ==========================================================================
 */

const FIX_ICONS: Record<string, LucideIcon> = {
  Skills: Wrench,
  Projects: FlaskConical,
  Presentation: CaseSensitive,
};

export function Suggestions() {
  const router = useRouter();

  return (
    <StudentPage width="medium">
      <StudentTopBar title="Raise my score" />

      <div className="mb-5 flex flex-col gap-0.5">
        <h1 className="text-[26px] font-bold leading-[30px] tracking-[-0.025em] text-[#0A1931]">
          Three fixes, biggest first
        </h1>
        <p className="text-[14px] leading-5 text-[#3A4761]">
          Do all three and you gain about{" "}
          <strong className="text-[#0A1931]">+{totalImprovementPoints} points</strong>.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {improvementFixes.map((fix) => {
        const Icon = FIX_ICONS[fix.category] ?? Wrench;
        return (
          <div
            key={fix.id}
            className="flex flex-col gap-3 rounded-[20px] border border-[#E7E0D4] bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#5F4DB2] text-white">
                <Icon size={16} />
              </span>
              <span className="flex-1 text-[11px] font-bold uppercase leading-3 tracking-[0.1em] text-[#5F6B80]">
                Fix 0{fix.index} · {fix.category}
              </span>
              <span className="rounded-full border border-[#DDD6C7] px-3 py-1.5 text-[12px] font-bold text-[#0A1931]">
                +{fix.points}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[18px] font-bold leading-6 tracking-[-0.02em] text-[#0A1931]">
                {fix.title}
              </span>
              <span className="text-[14px] leading-5 text-[#3A4761]">
                {fix.description}
              </span>
            </div>

            {fix.skills ? (
              <div className="flex flex-wrap gap-2">
                {fix.skills.map((skill) => (
                  <SkillChip key={skill} variant="add" icon={<Plus size={12} />}>
                    {skill}
                  </SkillChip>
                ))}
              </div>
            ) : null}

            <PillButton
              variant={fix.skills ? "primary" : "in-card"}
              className="w-full !py-4"
              onClick={() => router.push("/student/score")}
            >
              {fix.actionLabel}
            </PillButton>
          </div>
        );
        })}
      </div>
    </StudentPage>
  );
}
