"use client";

import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BadgeCheck,
  Bookmark,
  Share2,
  CheckCircle2,
  Check,
  Plus,
  MapPin,
  Clock,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  applyToJob,
  toggleSavedJob,
  selectHasApplied,
  selectIsJobSaved,
} from "@/store/student";
import { findJob, studentScore } from "@/features/student/data";
import {
  IconCircleButton,
  StatusChip,
  SkillChip,
  NoteStrip,
  PillButton,
  StudentCard,
  EmptyState,
} from "@/features/student/components";
import { StudentTopBar, StudentPage } from "@/features/student/shell";

/*
 * ==========================================================================
 * JOB DETAIL — a navy hero banner with the bar gauge, then a responsive
 * two-column layout (details + apply card). Renders the "you qualify" and
 * "short of the bar" variants from one component.
 * ==========================================================================
 */

export function JobDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const job = findJob(params.id);
  const saved = useAppSelector(selectIsJobSaved(params.id));
  const applied = useAppSelector(selectHasApplied(params.id));

  if (!job) {
    return (
      <StudentPage width="narrow">
        <EmptyState
          title="Job not found"
          message="This job may have been closed. Head back to the feed for open roles."
        />
        <div className="mt-4">
          <PillButton
            className="w-full"
            onClick={() => router.push("/student/jobs")}
          >
            Back to jobs
          </PillButton>
        </div>
      </StudentPage>
    );
  }

  const isMatch = job.match === "match";
  const you = studentScore.value;
  const bar = job.requiredScore;
  const reach = Math.min(100, Math.max(6, ((you - 600) / (990 - 600)) * 100));
  const barPos = Math.min(100, Math.max(0, ((bar - 600) / (990 - 600)) * 100));

  const apply = () => {
    dispatch(applyToJob(job.id));
    router.push("/student/board");
  };

  let applyActions: ReactNode;
  if (!isMatch) {
    applyActions = (
      <PillButton
        className="w-full"
        onClick={() => router.push("/student/score/improve")}
      >
        Raise my score
      </PillButton>
    );
  } else if (applied) {
    applyActions = (
      <PillButton
        variant="secondary"
        className="w-full"
        onClick={() => router.push("/student/board")}
      >
        Applied · see my board
      </PillButton>
    );
  } else {
    applyActions = (
      <div className="flex gap-2">
        <PillButton
          variant="secondary"
          className="flex-1"
          onClick={() => dispatch(toggleSavedJob(job.id))}
        >
          {saved ? "Saved" : "Save"}
        </PillButton>
        <PillButton className="flex-[1.5]" onClick={apply}>
          Apply now
        </PillButton>
      </div>
    );
  }

  return (
    <StudentPage width="medium">
      <StudentTopBar
        title={job.title}
        right={
          <div className="flex items-center gap-2">
            <IconCircleButton
              aria-label={saved ? "Remove saved job" : "Save job"}
              onClick={() => dispatch(toggleSavedJob(job.id))}
            >
              <Bookmark
                size={16}
                fill={saved ? "#5F4DB2" : "none"}
                className={saved ? "text-[#5F4DB2]" : ""}
              />
            </IconCircleButton>
            <IconCircleButton aria-label="Share">
              <Share2 size={16} />
            </IconCircleButton>
          </div>
        }
      />

      {/* Hero banner */}
      <div className="flex flex-col gap-4 rounded-[24px] bg-[#5F4DB2] p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-[16px] font-bold text-[#F4D685]">
            {job.monogram}
          </span>
          <div className="flex flex-col gap-1 pt-1">
            <span className="text-[22px] font-bold leading-7 tracking-[-0.02em] text-white">
              {job.title}
            </span>
            <span className="flex items-center gap-1.5 text-[13px] text-[#E0DBF4]">
              {job.company}
              {job.companyVerified ? (
                <BadgeCheck size={14} className="text-[#F4D685]" />
              ) : null}
            </span>
          </div>
        </div>

        {/* Bar gauge */}
        <div className="flex flex-col gap-3 rounded-2xl border border-white/20 bg-white/10 p-4">
          <div className="relative pt-6">
            <span
              className="absolute top-0 -translate-x-1/2 rounded-full bg-white px-2 py-[3px] text-[10px] font-bold text-[#0A1931]"
              style={{ left: `${reach}%` }}
            >
              You {you}
            </span>
            <span className="relative block h-1.5 rounded-full bg-white/25">
              <span
                className="absolute left-0 top-0 bottom-0 rounded-full"
                style={{
                  width: `${reach}%`,
                  background: "linear-gradient(90deg,#F4D685,#D4AF37)",
                }}
              />
              <span
                className="absolute -top-1 -bottom-1 w-0.5 rounded bg-white"
                style={{ left: `${barPos}%` }}
              />
            </span>
            <div className="mt-2 flex justify-between text-[10px] text-[#E0DBF4]">
              <span>Your score {you}</span>
              <span className="font-semibold text-white">Their bar {bar}</span>
            </div>
          </div>

          {isMatch ? (
            <StatusChip tone="match" icon={<CheckCircle2 size={12} />}>
              Bar cleared
            </StatusChip>
          ) : (
            <div className="flex items-center gap-2">
              <StatusChip tone="short">{job.pointsShort} short</StatusChip>
              <span className="text-[12px] text-[#E0DBF4]">
                The employer set this bar, not us.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Details + apply */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Left: details */}
        <div className="flex flex-col gap-3.5">
          {!isMatch && job.closingFix ? (
            <>
              <span className="text-[11px] font-bold uppercase leading-4 tracking-[0.12em] text-[#5F6B80]">
                One fix closes the gap
              </span>
              <button
                type="button"
                onClick={() => router.push("/student/score/improve")}
                className="flex items-center justify-between gap-3 rounded-[20px] border border-[#E7E0D4] bg-white p-4 text-left transition-transform active:scale-[.99]"
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#5F4DB2] text-white">
                    <Plus size={16} />
                  </span>
                  <span className="text-[14px] font-semibold text-[#0A1931]">
                    {job.closingFix.title}
                  </span>
                </span>
                <span className="rounded-full border border-[#DDD6C7] px-3 py-1.5 text-[12px] font-bold text-[#0A1931]">
                  +{job.closingFix.points}
                </span>
              </button>
            </>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <MetaChip icon={<MapPin size={13} />}>{job.workMode}</MetaChip>
            <MetaChip icon={<Clock size={13} />}>{job.category}</MetaChip>
            <MetaChip>{job.isFresher ? "Fresher friendly" : "Some experience"}</MetaChip>
          </div>

          <span className="pt-1 text-[11px] font-bold uppercase leading-4 tracking-[0.12em] text-[#5F6B80]">
            What you would do
          </span>
          <p className="text-[14px] leading-[22px] text-[#3A4761]">
            {job.responsibilities}
          </p>

          <span className="pt-1 text-[11px] font-bold uppercase leading-4 tracking-[0.12em] text-[#5F6B80]">
            Skills they look for
          </span>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill) => (
              <SkillChip key={skill} variant="add" icon={<Check size={12} />}>
                {skill}
              </SkillChip>
            ))}
          </div>

          <NoteStrip icon={<Bookmark size={16} />}>
            Your name stays hidden until an employer opens your profile. Your
            resume file is never shared.
          </NoteStrip>
        </div>

        {/* Right: apply card */}
        <div className="h-fit lg:sticky lg:top-4">
          <StudentCard>
            <div className="flex flex-col gap-3">
              <span className="text-[20px] font-bold tracking-[-0.02em] text-[#0A1931]">
                {job.salaryLabel}
                <span className="text-[13px] font-normal text-[#5F6B80]">/mo</span>
              </span>
              <span className="text-[13px] text-[#5F6B80]">
                {job.location}
                {job.distanceKm != null ? ` · ${job.distanceKm} km away` : ""}
              </span>
              <span className="text-[13px] text-[#5F6B80]">
                Posted {job.postedAgo} · {job.applicantCount} applied
              </span>
              <div className="mt-1 border-t border-[#F0EBDF] pt-3">{applyActions}</div>
            </div>
          </StudentCard>
        </div>
      </div>
    </StudentPage>
  );
}

function MetaChip({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-[#F7F4EC] px-3 py-2 text-[12px] font-medium text-[#3A4761]">
      {icon}
      {children}
    </span>
  );
}
