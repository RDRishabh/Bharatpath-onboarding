"use client";

import { useParams } from "next/navigation";
import { Video, Check, Undo2 } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { withdrawApplication, selectApplications } from "@/store/student";
import { StudentTopBar, StudentPage } from "@/features/student/shell";
import {
  MonogramTile,
  StatusChip,
  StudentCard,
  PillButton,
  EmptyState,
  type ChipTone,
} from "@/features/student/components";

/*
 * ==========================================================================
 * APPLICATION DETAIL — the full record for one application: the interview
 * card when it advanced, a "where things stand" timeline, and withdraw.
 * ==========================================================================
 */

const STATUS_TONE: Record<string, ChipTone> = {
  SUBMITTED: "waiting",
  VIEWED: "waiting",
  SHORTLISTED: "advanced",
  INTERVIEW: "advanced",
  OFFER: "advanced",
  REJECTED: "short",
  WITHDRAWN: "neutral",
};

export function ApplicationDetail() {
  const params = useParams<{ id: string }>();
  const dispatch = useAppDispatch();

  const application = useAppSelector(selectApplications).find(
    (app) => app.id === params.id,
  );

  if (!application) {
    return (
      <StudentPage width="narrow">
        <StudentTopBar title="Application" />
        <EmptyState
          title="Application not found"
          message="This application is no longer on your board."
        />
      </StudentPage>
    );
  }

  const withdrawn = application.status === "WITHDRAWN";

  return (
    <StudentPage width="medium">
      <StudentTopBar title={application.title} />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Main column */}
        <div className="flex flex-col gap-4">
          {/* Identity */}
          <div className="flex items-center gap-3">
            <MonogramTile tint="indigo" size={48}>
              {application.monogram}
            </MonogramTile>
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-[15px] font-bold tracking-[-0.02em] text-[#0A1931]">
                {application.company}
              </span>
              <span className="text-[12px] text-[#5F6B80]">
                Applied {application.appliedOn}
              </span>
            </div>
            <StatusChip tone={STATUS_TONE[application.status]}>
              {application.stageLabel}
            </StatusChip>
          </div>

          {/* Timeline */}
          <StudentCard>
            <span className="text-[15px] font-semibold text-[#0A1931]">
              Where things stand
            </span>
            <ol className="mt-4 flex flex-col">
              {application.timeline.map((step, index) => {
                const isLast = index === application.timeline.length - 1;
                return (
                  <li key={step.label} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={[
                          "grid h-6 w-6 shrink-0 place-items-center rounded-full",
                          step.reached
                            ? "bg-[#5F4DB2] text-white"
                            : "border border-[#E7E0D4] bg-white text-[#B5AC96]",
                        ].join(" ")}
                      >
                        {step.reached ? <Check size={12} /> : null}
                      </span>
                      {!isLast ? (
                        <span
                          className="w-px flex-1"
                          style={{
                            minHeight: 22,
                            background: step.reached ? "#5F4DB2" : "#E7E0D4",
                          }}
                        />
                      ) : null}
                    </div>
                    <span
                      className={[
                        "pb-5 text-[14px] leading-5",
                        step.reached
                          ? "font-medium text-[#0A1931]"
                          : "text-[#8891a0]",
                      ].join(" ")}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </StudentCard>
        </div>

        {/* Side column */}
        <div className="flex flex-col gap-4">
          {application.interview && !withdrawn ? (
            <StudentCard>
              <div className="flex flex-col gap-3">
                <span className="flex items-center gap-2 text-[11px] font-bold uppercase leading-3 tracking-[0.12em] text-[#4A3E8F]">
                  <Video size={14} />
                  Interview scheduled
                </span>
                <span className="text-[20px] font-bold tracking-[-0.02em] text-[#0A1931]">
                  {application.interview.when}
                </span>
                <span className="text-[13px] leading-[18px] text-[#5E4DB2]">
                  {application.interview.mode}, with {application.interview.withWhom}.
                </span>
                <div className="flex gap-2 pt-1">
                  <PillButton variant="in-card" className="flex-1 !py-3 !text-[14px]">
                    Add to calendar
                  </PillButton>
                  <PillButton className="flex-1 !py-3 !text-[14px]">Join call</PillButton>
                </div>
              </div>
            </StudentCard>
          ) : null}

          {!withdrawn ? (
            <PillButton
              variant="secondary"
              className="w-full !text-[#3A4761]"
              icon={<Undo2 size={16} />}
              onClick={() => dispatch(withdrawApplication(application.id))}
            >
              Withdraw application
            </PillButton>
          ) : (
            <div className="rounded-2xl bg-[#F7F4EC] p-4 text-center text-[13px] text-[#5F6B80]">
              You withdrew this application. Your data stays with you.
            </div>
          )}
        </div>
      </div>
    </StudentPage>
  );
}
