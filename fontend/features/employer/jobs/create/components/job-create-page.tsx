"use client";

import {
  ArrowLeft,
  LockKeyhole,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { ConfigurableForm } from "@/components/forms/configurable-form";
import type { FormFieldConfig } from "@/components/forms/configurable-form.types";
import { usePageHeader } from "@/components/layout/header-context";

import { useJobCreateForm } from "../hooks/use-job-create-form";
import type { CreateJobFormValues } from "../types";
import { JobSkillsField } from "./job-skills-field";

const employmentOptions = [
  {
    label: "Full time",
    value: "Full time",
  },
  {
    label: "Part time",
    value: "Part time",
  },
  {
    label: "Contract",
    value: "Contract",
  },
];

export interface JobCreatePageProps {
  canPublish?: boolean;
  initialValues?: CreateJobFormValues;
  heading?: string;
}

export function JobCreatePage({
  canPublish = false,
  initialValues,
  heading = "Create job",
}: JobCreatePageProps) {
  const router = useRouter();

  const {
    values,
    errors,
    setValue,
    validate,
    matchingCandidateCount,
  } = useJobCreateForm(initialValues);

  const [toast, setToast] =
    useState<string | null>(null);

  usePageHeader(
    heading,
    "Set requirements once. Every applicant is matched against them",
  );

  const fields: Array<
    FormFieldConfig<CreateJobFormValues>
  > = [
      {
        name: "title",
        label: "Job title",
        type: "text",
        placeholder: "Lab Analyst Trainee",
        required: true,
        colSpan: 2,
      },
      {
        name: "employmentType",
        label: "Employment type",
        type: "select",
        options: employmentOptions,
        required: true,
      },
      {
        name: "location",
        label: "Location",
        type: "text",
        placeholder: "Kothrud, Pune",
        required: true,
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        placeholder:
          "What will this person do day to day?",
        required: true,
        colSpan: 2,
      },
    ];

  const showToast = (message: string) => {
    setToast(message);

    window.setTimeout(
      () => setToast(null),
      2200,
    );
  };

  const saveDraft = () => {
    showToast("Draft saved");
  };

  const publishJob = () => {
    if (!canPublish) {
      return;
    }

    if (!validate()) {
      return;
    }

    showToast("Job published");

    window.setTimeout(() => {
      router.push("/employer/jobs");
    }, 650);
  };

  return (
    <main className="min-h-full bg-[#f7f8fa]">
      <div className="w-full max-w-[800px]">
        <button
          type="button"
          onClick={() =>
            router.push("/employer/jobs")
          }
          className="mb-5 inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-[#283247] hover:text-[#151b2b]"
        >
          <ArrowLeft
            size={16}
            strokeWidth={2}
          />

          Back to jobs
        </button>

        {/* BASICS */}
        <section className="rounded-[14px] border border-[#e1e5ea] bg-white p-5 shadow-[0_4px_12px_rgba(19,26,38,0.025)] sm:p-6">
          <SectionTitle>
            Basics
          </SectionTitle>

          <ConfigurableForm<CreateJobFormValues>
            values={values}
            fields={fields}
            errors={errors}
            onChange={(name, value) =>
              setValue(
                name,
                value as CreateJobFormValues[typeof name],
              )
            }
            validate={(formValues) => {
              const next = {
                title: !String(
                  formValues.title ?? "",
                ).trim()
                  ? "Job title is required."
                  : undefined,

                location: !String(
                  formValues.location ?? "",
                ).trim()
                  ? "Location is required."
                  : undefined,

                description: !String(
                  formValues.description ?? "",
                ).trim()
                  ? "Description is required."
                  : undefined,
              };

              return Object.fromEntries(
                Object.entries(next).filter(
                  ([, message]) => message,
                ),
              ) as Partial<
                Record<
                  keyof CreateJobFormValues &
                  string,
                  string
                >
              >;
            }}
            onSubmit={() => undefined}
          />
        </section>

        {/* REQUIREMENTS & PAY */}
        <section className="mt-5 rounded-[14px] border border-[#e1e5ea] bg-white p-5 shadow-[0_4px_12px_rgba(19,26,38,0.025)] sm:p-6">
          <SectionTitle>
            Requirements &amp; pay
          </SectionTitle>

          <div className="space-y-5">
            <JobSkillsField
              value={values.skills}
              error={errors.skills}
              onChange={(skills) =>
                setValue("skills", skills)
              }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldShell
                label="Salary min (₹/month)"
                error={errors.salaryMin}
              >
                <input
                  type="number"
                  min={0}
                  value={values.salaryMin}
                  onChange={(event) =>
                    setValue(
                      "salaryMin",
                      event.target.value === ""
                        ? ""
                        : Number(
                          event.target.value,
                        ),
                    )
                  }
                  className={inputClasses}
                />
              </FieldShell>

              <FieldShell
                label="Salary max (₹/month)"
                error={errors.salaryMax}
              >
                <input
                  type="number"
                  min={0}
                  value={values.salaryMax}
                  onChange={(event) =>
                    setValue(
                      "salaryMax",
                      event.target.value === ""
                        ? ""
                        : Number(
                          event.target.value,
                        ),
                    )
                  }
                  className={inputClasses}
                />
              </FieldShell>
            </div>

            <FieldShell
              label="Minimum score threshold"
              trailing={
                <span className="text-[15px] font-bold text-[#151b2b]">
                  {values.minScore}
                </span>
              }
              error={errors.minScore}
            >
              <input
                type="range"
                min={680}
                max={999}
                value={values.minScore}
                onChange={(event) =>
                  setValue(
                    "minScore",
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="w-full cursor-pointer accent-[#2f5da8]"
              />

              <div className="mt-1.5 flex justify-between text-[11px] text-[#7b8493]">
                <span>680</span>
                <span>999</span>
              </div>
            </FieldShell>

            <div className="flex items-center gap-2.5 rounded-[10px] bg-[#edf2fa] px-3.5 py-3">
              <UsersRound
                size={17}
                strokeWidth={2}
                className="shrink-0 text-[#28578f]"
              />

              <span className="text-[13px] font-medium leading-[17px] text-[#28578f]">
                {matchingCandidateCount}{" "}
                candidates in your pool currently
                meet this bar
              </span>
            </div>
          </div>
        </section>

        {/* REVIEW & PUBLISH */}
        <section className="mt-5 rounded-[14px] border border-[#e1e5ea] bg-white p-5 shadow-[0_4px_12px_rgba(19,26,38,0.025)] sm:p-6">
          <SectionTitle>
            Review &amp; publish
          </SectionTitle>

          {!canPublish ? (
            <div className="mb-4 flex items-start gap-2.5 rounded-[10px] bg-[#fff7e8] px-4 py-3.5">
              <LockKeyhole
                size={17}
                strokeWidth={2}
                className="mt-0.5 shrink-0 text-[#8a5a00]"
              />

              <p className="text-xs leading-[17px] text-[#8a5a00]">
                Publishing is locked until your
                business verification is approved.
                You can save this as a draft now
                and publish the moment you&apos;re
                cleared.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={saveDraft}
              className="flex-1 cursor-pointer rounded-[8px] border border-[#e1e5ea] bg-white px-4 py-3 text-sm font-semibold text-[#151b2b] transition hover:bg-[#f7f8fa]"
            >
              Save as draft
            </button>

            <button
              type="button"
              onClick={publishJob}
              disabled={!canPublish}
              className="flex-[1.5] cursor-pointer rounded-[8px] bg-[#151b2b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#222b3e] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Publish job
            </button>
          </div>
        </section>

        {toast ? (
          <div
            role="status"
            className="fixed bottom-5 right-5 rounded-[10px] bg-[#151b2b] px-4 py-3 text-sm font-semibold text-white shadow-lg"
          >
            {toast}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function SectionTitle({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.06em] text-[#687386]">
      {children}
    </h2>
  );
}

function FieldShell({
  label,
  error,
  trailing,
  children,
}: {
  label: string;
  error?: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-[12px] font-semibold leading-4 text-[#687386]">
        <span>{label}</span>

        {trailing}
      </span>

      {children}

      {error ? (
        <span className="mt-1.5 block text-xs font-medium text-[#b42318]">
          {error}
        </span>
      ) : null}
    </label>
  );
}

const inputClasses =
  "w-full rounded-[10px] border border-[#e1e5ea] bg-white px-4 py-3 text-[14px] font-medium leading-5 text-[#151b2b] outline-none transition focus:border-[#2f5da8] focus:ring-2 focus:ring-[#2f5da8]/10";