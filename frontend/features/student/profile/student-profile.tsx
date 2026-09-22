"use client";

import { useRouter } from "next/navigation";
import {
  ChevronRight,
  CircleUser,
  Languages,
  FileText,
  Compass,
  MicVocal,
  Lock,
  Eye,
  Bell,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setNotificationsEnabled,
  selectApplications,
} from "@/store/student";
import { studentProfile, studentScore } from "@/features/student/data";
import { SectionEyebrow } from "@/features/student/components";
import { StudentPage } from "@/features/student/shell";

/*
 * ==========================================================================
 * PROFILE (You) — the account hub. Quick stats, "my information" and the
 * privacy controls. The score is shown as a display value, never a raw field.
 * ==========================================================================
 */

export function StudentProfile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const applications = useAppSelector(selectApplications);
  const notificationsEnabled = useAppSelector(
    (state) => state.student.notificationsEnabled,
  );

  return (
    <StudentPage>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[#F1EAF7] text-[19px] font-bold text-[#4A3E8F]">
            {studentProfile.initials}
          </span>
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-[18px] font-bold tracking-[-0.02em] text-[#0A1931] sm:text-[22px]">
              {studentProfile.fullName}
            </span>
            <span className="text-[13px] text-[#5F6B80]">
              {studentProfile.degree} {studentProfile.branch} · {studentProfile.college}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          <StatTile
            value={String(studentScore.value)}
            label="Score"
            tone="indigo"
            onClick={() => router.push("/student/score")}
          />
          <StatTile
            value={String(applications.length)}
            label="Applications"
            onClick={() => router.push("/student/board")}
          />
          <StatTile
            value={`${studentProfile.profileCompletion}%`}
            label="Profile"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* My information */}
          <div className="flex flex-col gap-2">
            <SectionEyebrow icon={<CircleUser size={12} />}>My information</SectionEyebrow>
            <Row icon={<FileText size={20} />} label="My details" hint="Name, contact, resume" />
            <Row icon={<Compass size={20} />} label="Attribute report" hint="Steady builder" />
            <Row icon={<MicVocal size={20} />} label="Interview report" hint="Not taken yet" />
            <Row
              icon={<Languages size={20} />}
              label="Language"
              hint={studentProfile.language}
            />
          </div>

          {/* Privacy and data */}
          <div className="flex flex-col gap-2">
            <SectionEyebrow icon={<Lock size={12} />}>Privacy and data</SectionEyebrow>
            <Row
              icon={<Eye size={20} />}
              label="Who has seen me"
              hint="Every unlock, logged"
              onClick={() => router.push("/student/privacy")}
            />

            {/* Notifications toggle */}
            <div className="flex items-center gap-3 rounded-2xl border border-[#E7E0D4] bg-white p-4">
              <Bell size={20} className="text-[#0A1931]" />
              <span className="flex flex-1 flex-col">
                <span className="text-[15px] font-medium text-[#0A1931]">Notifications</span>
                <span className="text-[12px] text-[#5F6B80]">
                  Employer views, application updates, near-miss jobs
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={notificationsEnabled}
                aria-label="Toggle notifications"
                onClick={() =>
                  dispatch(setNotificationsEnabled(!notificationsEnabled))
                }
                className={[
                  "flex h-7 w-12 items-center rounded-full p-1 transition-colors",
                  notificationsEnabled
                    ? "justify-end bg-[#5F4DB2]"
                    : "justify-start bg-[rgba(10,25,49,0.2)]",
                ].join(" ")}
              >
                <span className="h-5 w-5 rounded-full bg-white" />
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#F7F4EC] p-4 text-[13px] leading-[18px] text-[#3A4761]">
          Your resume file is never shared. Employers see the parsed profile only —
          and only if you apply.
        </div>
      </div>
    </StudentPage>
  );
}

function StatTile({
  value,
  label,
  tone = "cream",
  onClick,
}: {
  value: string;
  label: string;
  tone?: "cream" | "indigo";
  onClick?: () => void;
}) {
  const indigo = tone === "indigo";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={[
        "flex min-w-0 flex-1 flex-col gap-1 rounded-2xl border p-3 text-left transition-transform",
        onClick ? "active:scale-[.97] cursor-pointer" : "cursor-default",
        indigo
          ? "border-[#5F4DB2] bg-[#5F4DB2] text-white"
          : "border-[#E7E0D4] bg-white text-[#0A1931]",
      ].join(" ")}
    >
      <span className="text-[22px] font-extrabold leading-6 tracking-[-0.03em]">
        {value}
      </span>
      <span className={indigo ? "text-[12px] text-[#E0DBF4]" : "text-[12px] text-[#5F6B80]"}>
        {label}
      </span>
    </button>
  );
}

function Row({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={[
        "flex items-center gap-3 rounded-2xl border border-[#E7E0D4] bg-white p-4 text-left",
        onClick ? "transition-colors hover:bg-[#FFFDF9] cursor-pointer" : "cursor-default",
      ].join(" ")}
    >
      <span className="text-[#0A1931]">{icon}</span>
      <span className="flex flex-1 flex-col">
        <span className="text-[15px] font-medium text-[#0A1931]">{label}</span>
        {hint ? <span className="text-[12px] text-[#5F6B80]">{hint}</span> : null}
      </span>
      {onClick ? <ChevronRight size={18} className="text-[#5F6B80]" /> : null}
    </button>
  );
}
