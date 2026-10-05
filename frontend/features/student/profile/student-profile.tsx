"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  Building2,
  ChevronRight,
  CircleUser,
  ClipboardCheck,
  Eye,
  FileText,
  GraduationCap,
  Languages,
  Lock,
  MapPin,
  Mic2,
  type LucideIcon,
} from "lucide-react";

import {
  useGetStudentApplicationsQuery,
  useGetStudentCollegeLinksQuery,
  useGetStudentCoursesQuery,
  useGetStudentProfileQuery,
  useGetStudentProfileViewsQuery,
  useGetStudentScoreQuery,
  useUpdateStudentLocationMutation,
  useUpdateStudentNameMutation,
} from "@/store/student";
import {
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from "@/store/api/notification-api";
import { showSuccessFeedback } from "@/lib/feedback/success-feedback";
import { initials, formatDateTime } from "@/features/student/formatters";
import type { StudentProfile as StudentProfileData } from "@/features/student/types";
import {
  interactiveCardClass,
  NoteStrip,
  PillButton,
  SectionEyebrow,
  StudentCard,
  StudentErrorState,
} from "@/features/student/components";
import { Skeleton } from "@/components/common/loading";
import { StudentProfileSkeleton } from "@/features/student/loading";
import { StudentPage } from "@/features/student/shell";

export function StudentProfile() {
  const router = useRouter();
  const profile = useGetStudentProfileQuery();
  const score = useGetStudentScoreQuery();
  const applications = useGetStudentApplicationsQuery({ limit: 100 });
  const courses = useGetStudentCoursesQuery();
  const colleges = useGetStudentCollegeLinksQuery();
  const preferences = useGetNotificationPreferencesQuery();
  const [updatePreferences, preferencesState] =
    useUpdateNotificationPreferencesMutation();

  const notificationsEnabled = preferences.data?.push_enabled ?? false;
  const activeCollegeLinks =
    colleges.data?.filter((link) => link.revokedAt === null).length ?? 0;

  if (
    profile.isLoading ||
    score.isLoading ||
    applications.isLoading ||
    courses.isLoading ||
    colleges.isLoading ||
    preferences.isLoading
  ) {
    return <StudentProfileSkeleton />;
  }

  return (
    <StudentPage>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[#F1EAF7] text-[19px] font-bold text-[#4A3E8F]">
            {initials(profile.data?.fullName)}
          </span>
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-[18px] font-bold tracking-[-0.02em] text-[#0A1931] sm:text-[22px]">
              {profile.data?.fullName ?? "Student"}
            </span>
            <span className="text-[13px] text-[#5F6B80]">
              {[profile.data?.city, profile.data?.stateCode]
                .filter(Boolean)
                .join(", ") || "Location not added"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          <StatTile
            value={
              score.data?.status === "READY" && score.data.value != null
                ? String(score.data.value)
                : "—"
            }
            label="Score"
            tone="indigo"
            onClick={() => router.push("/student/score")}
          />
          <StatTile
            value={String(
              applications.data?.total ??
                applications.data?.items.length ??
                0,
            )}
            label="Applications"
            onClick={() => router.push("/student/board")}
          />
          <StatTile value={String(activeCollegeLinks)} label="Colleges" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <SectionEyebrow icon={<CircleUser size={12} />}>
              My information
            </SectionEyebrow>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <ProfileAction icon={FileText} title="Resume details" detail="Review and edit extracted information" tone="violet" onClick={() => router.push("/student/profile/resume")} />
              <ProfileAction icon={ClipboardCheck} title="Attribute report" detail="View your completed assessment" tone="green" onClick={() => router.push("/student/attribute")} />
              <ProfileAction icon={Mic2} title="Interview report" detail="Practice history and feedback" tone="orange" onClick={() => router.push("/student/interview")} />
              <ProfileAction icon={BookOpen} title="Skill courses" detail={`${courses.data?.length ?? 0} available · ${courses.data?.filter((course) => course.completed).length ?? 0} completed`} tone="blue" onClick={() => router.push("/student/courses")} />
              <ProfileAction icon={Languages} title="Language" detail="English" tone="gold" />
              <ProfileAction icon={GraduationCap} title="College links" detail={`${activeCollegeLinks} active`} tone="slate" />
            </div>
            {profile.data ? (
              <ProfileForm
                profile={profile.data}
              />
            ) : (
              <StudentCard>Loading profile…</StudentCard>
            )}

            <ProfileViewsCard />
          </div>

          <div className="flex flex-col gap-2">
            <SectionEyebrow icon={<Lock size={12} />}>Privacy and data</SectionEyebrow>
            <button
              type="button"
              onClick={() => router.push("/student/privacy")}
              className={`flex items-center gap-3 rounded-2xl border border-[#E7E0D4] bg-white p-4 text-left ${interactiveCardClass}`}
            >
              <Eye size={20} className="text-[#5F4DB2]" />
              <span className="flex flex-1 flex-col">
                <span className="text-[15px] font-medium text-[#0A1931]">
                  Who has seen me
                </span>
                <span className="text-[12px] text-[#5F6B80]">
                  See which employers opened your profile
                </span>
              </span>
              <ChevronRight size={17} className="shrink-0 text-[#7B8495]" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-3 rounded-2xl border border-[#E7E0D4] bg-white p-4">
              <Bell size={20} className="text-[#0A1931]" />
              <span className="flex flex-1 flex-col">
                <span className="text-[15px] font-medium text-[#0A1931]">
                  Push notifications
                </span>
                <span className="text-[12px] text-[#5F6B80]">
                  Application and account updates
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={notificationsEnabled}
                disabled={preferences.isLoading || preferencesState.isLoading}
                onClick={() =>
                  void updatePreferences({
                    push_enabled: !notificationsEnabled,
                  })
                }
                className={[
                  "flex h-7 w-12 cursor-pointer items-center rounded-full p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5F4DB2]/30",
                  notificationsEnabled
                    ? "justify-end bg-[#5F4DB2] enabled:hover:bg-[#4A3E8F]"
                    : "justify-start bg-[rgba(10,25,49,0.2)] enabled:hover:bg-[rgba(10,25,49,0.3)]",
                ].join(" ")}
              >
                <span className="h-5 w-5 rounded-full bg-white" />
              </button>
            </div>
            <NoteStrip icon={<MapPin size={16} />}>
              Only your city and state are used for job discovery. Do not enter a
              street address.
            </NoteStrip>
          </div>
        </div>
      </div>
    </StudentPage>
  );
}

function ProfileAction({ icon: Icon, title, detail, tone, onClick }: {
  icon: LucideIcon;
  title: string;
  detail: string;
  tone: "violet" | "green" | "orange" | "blue" | "gold" | "slate";
  onClick?: () => void;
}) {
  const toneClass = {
    violet: "bg-[#F1EAF7] text-[#5F4DB2]",
    green: "bg-[#E6F1EA] text-[#1F6B45]",
    orange: "bg-[#FFF0E7] text-[#A65325]",
    blue: "bg-[#E8F0FA] text-[#3566B8]",
    gold: "bg-[#F7EFD6] text-[#85650F]",
    slate: "bg-[#EEF1F5] text-[#475569]",
  }[tone];
  const content = (
    <>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClass}`}>
        <Icon size={19} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[14px] font-semibold text-[#0A1931]">{title}</span>
        <span className="line-clamp-2 text-[11px] leading-4 text-[#5F6B80]">{detail}</span>
      </span>
      {onClick ? <ChevronRight size={17} className="shrink-0 text-[#7B8495]" aria-hidden="true" /> : null}
    </>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className={`group flex min-h-20 items-center gap-3 rounded-2xl border border-[#E7E0D4] bg-white p-3.5 text-left ${interactiveCardClass}`}>
      {content}
    </button>
  ) : (
    <div className="flex min-h-20 items-center gap-3 rounded-2xl border border-[#E7E0D4] bg-white p-3.5">{content}</div>
  );
}

/**
 * `GET /candidate/profile/views`: the organisations that opened this profile
 * in the last 90 days, latest first. The organisation only — never the
 * recruiter in it, and never a count of opens, which is what the API itself
 * is limited to.
 */
function ProfileViewsCard() {
  const views = useGetStudentProfileViewsQuery({ limit: 10 });

  return (
    <StudentCard className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Building2 size={20} className="text-[#5F4DB2]" />
        <span className="flex flex-1 flex-col">
          <span className="text-[15px] font-medium text-[#0A1931]">
            Profile views
          </span>
          <span className="text-[12px] text-[#5F6B80]">
            {views.isLoading
              ? "Loading…"
              : views.isError
                ? "Could not load who viewed your profile"
                : "Organisations that opened your profile"}
          </span>
        </span>
      </div>

      {views.isLoading ? (
        <div className="flex flex-col gap-2" aria-label="Loading profile views">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} width="100%" height={14} radius={6} />
          ))}
        </div>
      ) : views.isError ? (
        <StudentErrorState
          variant="inline"
          error={views.error}
          fallback="We could not load your profile views."
          onRetry={() => void views.refetch()}
        />
      ) : views.data?.items.length ? (
        <>
          <ul className="flex flex-col divide-y divide-[#F0EBDF]">
            {views.data.items.map((view) => (
              <li
                key={`${view.employerName}-${view.lastViewedAt}`}
                className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <span className="min-w-0 truncate text-[13px] font-medium text-[#0A1931]">
                  {view.employerName}
                </span>
                <span className="shrink-0 text-[11px] text-[#5F6B80]">
                  {formatDateTime(view.lastViewedAt)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] leading-4 text-[#5F6B80]">
            Last 90 days, most recent first. Which organisation looked — never
            which person, and never how many times.
          </p>
        </>
      ) : (
        <p className="text-[12px] leading-5 text-[#5F6B80]">
          No organisation has opened your profile in the last 90 days.
        </p>
      )}
    </StudentCard>
  );
}

function ProfileForm({
  profile,
}: {
  profile: StudentProfileData;
}) {
  const [updateName, nameState] = useUpdateStudentNameMutation();
  const [updateLocation, locationState] = useUpdateStudentLocationMutation();
  const [fullName, setFullName] = useState(profile.fullName ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [stateCode, setStateCode] = useState(profile.stateCode ?? "");
  const profileError = nameState.error ?? locationState.error;

  const saveProfile = async () => {
    try {
      let saved = false;
      if (fullName.trim() !== (profile.fullName ?? "")) {
        await updateName(fullName.trim()).unwrap();
        saved = true;
      }
      if (
        city.trim() !== (profile.city ?? "") ||
        stateCode.trim().toUpperCase() !== (profile.stateCode ?? "")
      ) {
        await updateLocation({
          city: city.trim() || null,
          stateCode: stateCode.trim().toUpperCase() || null,
        }).unwrap();
        saved = true;
      }
      if (saved) {
        showSuccessFeedback("Profile updated.");
      }
    } catch {
      // The mutation error is rendered below the form.
    }
  };

  return (
    <StudentCard className="flex flex-col gap-3">
      <Field
        label="Full name"
        value={fullName}
        onChange={setFullName}
        placeholder="Your full name"
      />
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <Field
          label="City"
          value={city}
          onChange={setCity}
          placeholder="City"
        />
        <Field
          label="State"
          value={stateCode}
          onChange={setStateCode}
          placeholder="MH"
          maxLength={2}
        />
      </div>
      <PillButton
        disabled={
          nameState.isLoading || locationState.isLoading || !fullName.trim()
        }
        onClick={() => void saveProfile()}
      >
        {nameState.isLoading || locationState.isLoading
          ? "Saving…"
          : "Save profile"}
      </PillButton>
      {profileError ? (
        <StudentErrorState
          variant="inline"
          error={profileError}
          fallback="Could not save your profile."
        />
      ) : null}
    </StudentCard>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-[#3A4761]">
      {label}
      <input
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-[#E7E0D4] bg-white px-3 py-2.5 text-[14px] font-normal text-[#0A1931] outline-none focus:border-[#5F4DB2]"
      />
    </label>
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
        "flex min-w-0 flex-1 flex-col gap-1 rounded-2xl border p-3 text-left",
        indigo
          ? "border-[#5F4DB2] bg-[#5F4DB2] text-white"
          : "border-[#E7E0D4] bg-white text-[#0A1931]",
        onClick
          ? indigo
            ? `${interactiveCardClass} hover:border-[#4A3E8F] hover:bg-[#5646A6]`
            : interactiveCardClass
          : "cursor-default",
      ].join(" ")}
    >
      <span className="text-[22px] font-extrabold leading-6">{value}</span>
      <span className={indigo ? "text-[12px] text-[#E0DBF4]" : "text-[12px] text-[#5F6B80]"}>
        {label}
      </span>
    </button>
  );
}
