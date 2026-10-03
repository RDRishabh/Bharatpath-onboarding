"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, History, ShieldCheck } from "lucide-react";

import { FormSkeleton } from "@/components/common/loading";
import { StudentErrorState } from "@/features/student/components";
import { formatDateTime } from "@/features/student/formatters";
import { ManualStep } from "@/features/student/onboarding/components/intake-steps";
import { ReviewStep } from "@/features/student/onboarding/components/review-step";
import { StudentPage } from "@/features/student/shell";
import { showSuccessFeedback } from "@/lib/feedback/success-feedback";
import { useGetResumeVersionsQuery, type ManualResume } from "@/store/student";

type View =
  | { name: "review"; versionId: string }
  | { name: "edit"; versionId: string; resume: ManualResume };

export function ResumeDetails() {
  const router = useRouter();
  const versions = useGetResumeVersionsQuery();
  const current = useMemo(
    () => versions.data?.find((version) => !version.superseded) ?? versions.data?.[0],
    [versions.data],
  );
  const [view, setView] = useState<View | null>(null);
  const activeView: View | null =
    view ?? (current ? { name: "review", versionId: current.resumeVersionId } : null);

  return (
    <StudentPage className="max-w-none">
      <div className="w-full">
        <button
          type="button"
          onClick={() => router.push("/student/profile")}
          className="mb-5 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E7E0D4] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#3A4761] transition hover:bg-[#F7F4EC] hover:text-[#0A1931]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to profile
        </button>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,720px)_minmax(260px,1fr)] lg:gap-8">
          <main className="min-w-0">
            {versions.isLoading ? (
              <FormSkeleton fields={6} actions />
            ) : versions.isError ? (
              <StudentErrorState
                error={versions.error}
                title="Resume details could not be loaded"
                onRetry={() => void versions.refetch()}
              />
            ) : !current || !activeView ? (
              <div className="rounded-[24px] border border-dashed border-[#CFC6B4] bg-white p-8 text-center sm:p-12">
                <FileText className="mx-auto h-10 w-10 text-[#5F4DB2]" aria-hidden="true" />
                <h1 className="mt-4 text-2xl font-bold text-[#0A1931]">Add your resume</h1>
                <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-[#5F6B80]">
                  Upload, paste, or enter your details to build your student profile and score.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/signup/student")}
                  className="mt-6 cursor-pointer rounded-full bg-[#5F4DB2] px-6 py-3 text-[14px] font-semibold text-white hover:bg-[#4A3E8F]"
                >
                  Add resume
                </button>
              </div>
            ) : activeView.name === "edit" ? (
              <ManualStep
                initial={activeView.resume}
                editOf={activeView.versionId}
                defaultName={activeView.resume.full_name}
                onBack={() => setView({ name: "review", versionId: activeView.versionId })}
                onCreated={(versionId) => {
                  setView({ name: "review", versionId });
                  void versions.refetch();
                }}
              />
            ) : (
              <ReviewStep
                key={activeView.versionId}
                resumeVersionId={activeView.versionId}
                title="Resume details"
                subtitle="Review and edit the details extracted from your resume. Changes are saved as a new version."
                confirmLabel="Save changes"
                startOverLabel="Back to profile"
                onStartOver={() => router.push("/student/profile")}
                onEditStructured={(resume, versionId) => setView({ name: "edit", versionId, resume })}
                onConfirmed={() => {
                  showSuccessFeedback("Resume details saved.");
                  void versions.refetch();
                }}
              />
            )}
          </main>

          <aside className="hidden lg:sticky lg:top-6 lg:flex lg:flex-col lg:gap-4">
            <InfoCard
              icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
              title="Your resume stays private"
              body="Employers only receive resume information through the access rules of the student portal."
            />
            {current ? (
              <div className="rounded-[20px] border border-[#E7E0D4] bg-[#F7F4EC] p-5">
                <div className="flex items-center gap-2 text-[#3A4761]">
                  <History className="h-4 w-4" aria-hidden="true" />
                  <span className="text-[12px] font-bold uppercase tracking-[0.1em]">Current version</span>
                </div>
                <p className="mt-3 text-[13px] font-semibold text-[#0A1931]">
                  {current.confirmed ? "Confirmed" : "Needs confirmation"}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-[#5F6B80]">Updated {formatDateTime(current.createdAt)}</p>
                {current.confirmed ? (
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#1F6B45]">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Ready for your profile
                  </span>
                ) : null}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </StudentPage>
  );
}

function InfoCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-[20px] border border-[#E7E0D4] bg-white p-5">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#F1EAF7] text-[#5F4DB2]">{icon}</span>
      <h2 className="mt-4 text-[16px] font-bold text-[#0A1931]">{title}</h2>
      <p className="mt-2 text-[12px] leading-5 text-[#5F6B80]">{body}</p>
    </div>
  );
}
