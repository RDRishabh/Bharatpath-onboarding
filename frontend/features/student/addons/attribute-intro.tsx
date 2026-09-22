"use client";

import { useRouter } from "next/navigation";
import { Gift, Clock, EyeOff, Lock } from "lucide-react";

import { StudentTopBar, StudentPage } from "@/features/student/shell";
import {
  CommerceBadge,
  StudentCard,
  PillButton,
} from "@/features/student/components";

/*
 * ==========================================================================
 * ATTRIBUTE CHECK — intro. A free work-style questionnaire that is worth zero
 * points: nothing here changes the resume score, and employers see only a
 * badge. (The questionnaire flow itself is out of scope for this static build.)
 * ==========================================================================
 */

export function AttributeIntro() {
  const router = useRouter();

  return (
    <StudentPage width="narrow">
      <div className="flex flex-col gap-5">
      <StudentTopBar title="Attribute check" right={<CommerceBadge icon={<Gift size={12} />}>Free</CommerceBadge>} />

      <div className="grid h-[172px] place-items-center overflow-hidden rounded-[24px] border border-[#CDC4EA] bg-[#DDD6F2]">
        <span className="text-[15px] font-semibold text-[#4A3E8F]">
          24 questions · 6 minutes
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-8 tracking-[-0.03em] text-[#0A1931]">
          How you like to work
        </h1>
        <p className="text-[15px] leading-[22px] text-[#3A4761]">
          24 questions on work style and interests. You get a profile report at
          the end.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-[11px] font-bold uppercase leading-[14px] tracking-[0.12em] text-[#5F6B80]">
          Before you start
        </span>
        <StudentCard padded={false} className="px-4">
          <IntroRow icon={<Clock size={19} className="text-[#5E4DB2]" />} first>
            About 6 minutes. Pause whenever.
          </IntroRow>
          <IntroRow icon={<EyeOff size={19} className="text-[#0A1931]" />}>
            Employers see only a badge.
          </IntroRow>
          <IntroRow icon={<Lock size={19} className="text-[#0A1931]" />}>
            Your resume score does not move.
          </IntroRow>
        </StudentCard>
      </div>

      <div className="flex flex-col gap-2.5 pt-2">
        <PillButton className="w-full !py-4" onClick={() => router.push("/student")}>
          Start the 24 questions
        </PillButton>
        <span className="text-center text-[12px] leading-4 text-[#5F6B80]">
          Nothing here changes your resume score
        </span>
      </div>
    </div>
    </StudentPage>
  );
}

function IntroRow({
  children,
  icon,
  first,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  first?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center gap-3 py-3.5",
        first ? "" : "border-t border-[#F0EBDF]",
      ].join(" ")}
    >
      {icon}
      <span className="flex-1 text-[14px] leading-5 text-[#3A4761]">{children}</span>
    </div>
  );
}
