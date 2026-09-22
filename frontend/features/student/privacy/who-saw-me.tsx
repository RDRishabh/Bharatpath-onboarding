"use client";

import { Info } from "lucide-react";

import { profileViews } from "@/features/student/data";
import { StudentTopBar, StudentPage } from "@/features/student/shell";
import { MonogramTile, NoteStrip } from "@/features/student/components";

/*
 * ==========================================================================
 * WHO HAS SEEN ME — the employer-unlock audit log. Details show only when an
 * employer spends an unlock; the resume file itself is never shared.
 * ==========================================================================
 */

export function WhoSawMe() {
  return (
    <StudentPage width="narrow">
      <div className="flex flex-col gap-4">
      <StudentTopBar title="Who has seen me" />

      <div className="flex flex-col gap-0.5">
        <h1 className="text-[26px] font-bold leading-[30px] tracking-[-0.025em] text-[#0A1931]">
          Every unlock, logged
        </h1>
        <p className="text-[14px] leading-5 text-[#3A4761]">
          Details show only when an employer spends an unlock.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {profileViews.map((view) => (
          <div
            key={view.id}
            className="flex items-center gap-3 rounded-2xl border border-[#E7E0D4] bg-white p-4"
          >
            <MonogramTile tint="navy" size={40}>
              {view.monogram}
            </MonogramTile>
            <span className="flex flex-1 flex-col">
              <span className="text-[15px] font-semibold text-[#0A1931]">
                {view.company}
              </span>
              <span className="text-[12px] text-[#5F6B80]">{view.action}</span>
            </span>
            <span className="text-[12px] text-[#9AA3B2]">{view.when}</span>
          </div>
        ))}
      </div>

      <NoteStrip icon={<Info size={16} />} tone="amber">
        Your resume file is never shared. Employers see the parsed profile only.
      </NoteStrip>
      </div>
    </StudentPage>
  );
}
