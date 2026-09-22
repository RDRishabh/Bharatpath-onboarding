"use client";

import { useRouter } from "next/navigation";
import { MicVocal, Clock, ShieldCheck, EyeOff, Info } from "lucide-react";

import { StudentTopBar, StudentPage } from "@/features/student/shell";
import {
  CommerceBadge,
  StudentCard,
  PillButton,
  NoteStrip,
} from "@/features/student/components";

/*
 * ==========================================================================
 * MOCK INTERVIEW — intro. Six questions written for lab and QC roles, answered
 * on-device with a marked report. Device check runs before any payment.
 * (The recording flow itself is out of scope for this static build.)
 * ==========================================================================
 */

export function InterviewIntro() {
  const router = useRouter();

  return (
    <StudentPage width="narrow">
      <div className="flex flex-col gap-5">
      <StudentTopBar
        title="Mock interview"
        right={<CommerceBadge icon={<MicVocal size={12} />}>₹299</CommerceBadge>}
      />

      <div className="grid h-[172px] place-items-center overflow-hidden rounded-[24px] border border-[#BDC8E3] bg-[#CFD8ED]">
        <span className="text-[15px] font-semibold text-[#4A3E8F]">
          6 questions · about 15 minutes
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-8 tracking-[-0.03em] text-[#0A1931]">
          Practise before it counts
        </h1>
        <p className="text-[15px] leading-[22px] text-[#3A4761]">
          Six questions written for lab and QC roles. Answer on this phone and
          get a marked report.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-[11px] font-bold uppercase leading-[14px] tracking-[0.12em] text-[#5F6B80]">
          Before you start
        </span>
        <StudentCard padded={false} className="px-4">
          <IntroRow icon={<Clock size={19} className="text-[#5E4DB2]" />} first>
            About 15 minutes. One retake per question.
          </IntroRow>
          <IntroRow icon={<ShieldCheck size={19} className="text-[#0A1931]" />}>
            Camera, mic and network tested before any payment.
          </IntroRow>
          <IntroRow icon={<EyeOff size={19} className="text-[#0A1931]" />}>
            Feedback only — it never moves your resume score.
          </IntroRow>
        </StudentCard>
      </div>

      <NoteStrip icon={<Info size={16} />}>
        If the device check fails, you keep your money. Nothing is charged until
        the interview is ready to start.
      </NoteStrip>

      <div className="flex flex-col gap-2.5 pt-2">
        <PillButton className="w-full !py-4" onClick={() => router.push("/student")}>
          Check my phone first
        </PillButton>
        <span className="text-center text-[12px] leading-4 text-[#5F6B80]">
          Camera, mic and network tested before any payment
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
