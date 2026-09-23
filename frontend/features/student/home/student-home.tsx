"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase, ChevronRight, Rocket } from "lucide-react";

import {
  useGetInterviewOfferQuery,
  useGetQuestionnaireQuery,
  useGetStudentJobsQuery,
  useGetStudentProfileQuery,
  useGetStudentScoreQuery,
} from "@/store/student";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { firstName } from "@/features/student/formatters";
import {
  CommerceBadge,
  EmptyState,
  JobCard,
  SectionEyebrow,
} from "@/features/student/components";
import { StudentPage } from "@/features/student/shell";

export function StudentHome() {
  const router = useRouter();
  const profile = useGetStudentProfileQuery();
  const score = useGetStudentScoreQuery();
  const jobs = useGetStudentJobsQuery({ eligibleOnly: true, limit: 3 });
  const questionnaire = useGetQuestionnaireQuery();
  const interview = useGetInterviewOfferQuery();

  const jobsError = jobs.error
    ? getApiErrorMessage(jobs.error, "Could not load jobs.")
    : null;
  const questionCount =
    questionnaire.data?.sections.reduce(
      (total, section) => total + section.questions.length,
      0,
    ) ?? 0;
  const interviewPrice =
    !interview.data?.onSale || interview.data.priceMinor == null
      ? "Unavailable"
      : new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: interview.data.currency || "INR",
          maximumFractionDigits: 0,
        }).format(interview.data.priceMinor / 100);

  return (
    <StudentPage>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] leading-4 text-[#5F6B80]">
            {new Intl.DateTimeFormat("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "short",
            }).format(new Date())}
          </span>
          <span className="text-[26px] font-bold leading-8 tracking-[-0.025em] text-[#0A1931] sm:text-[30px]">
            Hi, {firstName(profile.data?.fullName)}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          <button
            type="button"
            onClick={() => router.push("/student/score")}
            className="relative flex min-h-48 flex-col justify-between gap-4 overflow-hidden rounded-[24px] bg-[#5F4DB2] p-5 text-left transition-transform active:scale-[.99] sm:p-6"
          >
            <span className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase leading-3 tracking-[0.14em] text-[#E0DBF4]">
                Your resume score
              </span>
              <ChevronRight size={16} className="text-white" />
            </span>
            {score.isLoading ? (
              <span className="text-[15px] text-[#E0DBF4]">Loading score…</span>
            ) : score.data?.status === "READY" && score.data.value != null ? (
              <>
                <span className="text-[52px] font-extrabold leading-none tracking-[-0.045em] text-white sm:text-[64px]">
                  {score.data.value}
                </span>
                <span className="text-[13px] text-[#E0DBF4]">
                  Band {score.data.band ?? "not available"}
                </span>
              </>
            ) : (
              <span className="text-[18px] font-semibold text-white">
                Your score is being prepared
              </span>
            )}
          </button>

          <div className="flex flex-col gap-3">
            <SectionEyebrow icon={<Rocket size={12} />}>Go further</SectionEyebrow>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <AddOnButton
                title="Attribute check"
                subtitle={
                  questionnaire.data?.submitted
                    ? "Report ready"
                    : questionCount
                      ? `${questionCount} questions`
                      : "Work-style questionnaire"
                }
                badge="Included"
                onClick={() => router.push("/student/attribute")}
              />
              <AddOnButton
                title="Mock interview"
                subtitle={
                  interview.data?.openSessionId
                    ? "Continue your session"
                    : `${interview.data?.sessionsAvailable ?? 0} sessions available`
                }
                badge={interviewPrice}
                onClick={() => router.push("/student/interview")}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <SectionEyebrow
            icon={<Briefcase size={12} />}
            action={
              <button
                type="button"
                onClick={() => router.push("/student/jobs")}
                className="flex items-center gap-1 text-[13px] font-semibold text-[#0A1931]"
              >
                All jobs
                <ChevronRight size={12} />
              </button>
            }
          >
            Jobs you qualify for
          </SectionEyebrow>

          {jobs.isLoading ? (
            <div className="rounded-2xl border border-[#E7E0D4] bg-white p-5 text-sm text-[#5F6B80]">
              Loading jobs…
            </div>
          ) : jobsError ? (
            <EmptyState title="Jobs unavailable" message={jobsError} />
          ) : jobs.data?.items.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {jobs.data.items.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No eligible jobs yet"
              message="New roles will appear here when they match your profile."
            />
          )}

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

function AddOnButton({
  title,
  subtitle,
  badge,
  onClick,
}: {
  title: string;
  subtitle: string;
  badge: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-3 overflow-hidden rounded-[20px] border border-[#CDC4EA] bg-[#DDD6F2] p-3 text-left transition-transform active:scale-[.98]"
    >
      <span className="flex items-start justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/70 text-[#4A3E8F]">
          <Rocket size={16} />
        </span>
        <CommerceBadge>{badge}</CommerceBadge>
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-bold leading-5 tracking-[-0.02em] text-[#0A1931]">
          {title}
        </span>
        <span className="text-[12px] leading-4 text-[#3A4761]">{subtitle}</span>
      </span>
    </button>
  );
}
