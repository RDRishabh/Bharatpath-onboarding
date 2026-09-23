"use client";

import { X } from "lucide-react";

import type { EmployerApplication, ApplicationStage } from "../types";
import { getScoreBand } from "../band";
import {
  APPLICATION_STAGES,
  CANDIDATE_SKILL_PROFILES,
  JOB_SKILL_PROFILES,
} from "../drawer-data";
import { SkillMatchSection } from "./drawer-skill-match";
import { StageProgress, StageMoveControls } from "./drawer-stage-controls";
import { InterviewField } from "./drawer-interview-field";
import { HirePanel } from "./drawer-hire-panel";

interface ApplicationDrawerProps {
  application: EmployerApplication | null;
  onClose: () => void;
  onMoveStage: (stage: ApplicationStage) => void;
  onMeetingLinkChange: (value: string) => void;
  onConfirmHire: () => void;
}

export function ApplicationDrawer({
  application,
  onClose,
  onMoveStage,
  onMeetingLinkChange,
  onConfirmHire,
}: ApplicationDrawerProps) {
  if (!application) {
    return null;
  }

  /*
   * Resolve the full candidate/job records from the IDs stored inside
   * EmployerApplication, falling back to the application's own summary.
   */
  const candidate =
    CANDIDATE_SKILL_PROFILES.find(
      (item) => item.id === application.candidate.id,
    ) ?? {
      id: application.candidate.id,
      name: application.candidate.name,
      skills: [],
      unlocked: application.candidate.unlocked,
    };

  const job =
    JOB_SKILL_PROFILES.find((item) => item.id === application.jobId) ?? {
      id: application.jobId,
      title: application.candidate.jobTitle,
      skills: [],
    };

  const band = getScoreBand(application.candidate.exactScore);

  const matchedSkills = candidate.skills.filter((skill) =>
    job.skills.includes(skill),
  );

  const otherCandidateSkills = candidate.skills.filter(
    (skill) => !matchedSkills.includes(skill),
  );

  const missingSkills = job.skills.filter(
    (skill) => !candidate.skills.includes(skill),
  );

  const currentStage = Number(application.stage);
  const currentStageLabel =
    APPLICATION_STAGES[currentStage]?.label ?? "Submitted";

  const canConfirmHire =
    currentStage === 4 && !application.hireEmployerConfirmed;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close application drawer"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[rgba(19,26,38,0.4)]"
      />

      {/* Drawer */}
      <aside className="absolute right-0 top-0 flex h-full w-[520px] max-w-[100vw] flex-col bg-white shadow-[-8px_0_30px_rgba(19,26,38,0.14)]">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-[#e7e9ee] px-6 py-5">
          <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <span className="truncate text-[16px] font-semibold leading-[21px] text-[#151b2b]">
              {candidate.name}
            </span>

            <span className="truncate text-[12px] font-normal leading-[17px] text-[#777f90]">
              Applied to {job.title} · {application.appliedDate}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-[#e1e5eb] bg-white text-[#151b2b] transition hover:bg-[#f3f4f7]"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-5">
            {/* Score band */}
            <span
              className="w-fit rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em]"
              style={{
                backgroundColor: band.background,
                color: band.color,
              }}
            >
              {band.label} · {application.candidate.exactScore}
            </span>

            <StageProgress
              currentStage={currentStage}
              currentStageLabel={currentStageLabel}
            />

            <SkillMatchSection
              matchedSkills={matchedSkills}
              otherCandidateSkills={otherCandidateSkills}
              missingSkills={missingSkills}
            />

            <StageMoveControls
              currentStage={currentStage}
              onMoveStage={onMoveStage}
            />

            {currentStage === 3 && (
              <InterviewField
                meetingLink={application.meetingLink}
                onMeetingLinkChange={onMeetingLinkChange}
              />
            )}

            {currentStage === 4 && (
              <HirePanel
                employerConfirmed={Boolean(application.hireEmployerConfirmed)}
                candidateConfirmed={Boolean(application.hireCandidateConfirmed)}
                canConfirmHire={canConfirmHire}
                onConfirmHire={onConfirmHire}
              />
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
