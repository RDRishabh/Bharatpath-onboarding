"use client";

import { useEffect, type ChangeEvent } from "react";
import { Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Skeleton } from "@/components/common/loading";
import { ErrorState } from "@/components/ui";
import { AppSelect } from "@/components/ui/app-select";
import {
  saveCompanyProfile,
  replaceCompanyProfile,
  selectCompanyProfile,
  updateCompanyField,
  useGetEmployerOrganisationQuery,
  useUpdateEmployerOrganisationMutation,
  useGetEmployerReferenceQuery,
} from "@/store/employer/settings";

const inputClass =
  "min-h-[43px] w-full rounded-[9px] border border-[#dfe4ea] bg-white px-3.5 text-[13px] text-[#111827] outline-none transition focus:border-[#526cc8] focus:ring-4 focus:ring-[#526cc8]/10 disabled:bg-[#f1f3f5] disabled:text-[#687385]";

// Match the native inputs above: 43px tall, same radius, border and text size.
const selectClass =
  "[&>button]:min-h-[43px] [&>button]:rounded-[9px] [&>button]:border-[#dfe4ea] [&>button>span]:text-[13px] [&>button>span]:font-normal [&>button>span]:text-[#111827]";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-3 flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold leading-[15px] text-[#526074]">
        {label}
      </span>
      {children}
    </label>
  );
}

function CompanyTabSkeleton() {
  return (
    <section
      aria-label="Loading company profile"
      aria-busy="true"
      className="max-w-[600px] rounded-xl border border-[#e0e4e9] bg-white p-5 shadow-[0_1px_2px_rgba(17,24,39,0.02)]"
    >
      <div className="mb-6 space-y-2">
        <Skeleton width={112} height={16} radius={6} />
        <Skeleton width={288} height={12} radius={6} />
      </div>
      <div className="mb-3 space-y-1.5">
        <Skeleton width={112} height={12} radius={6} />
        <Skeleton height={43} radius={9} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {["gstin", "type", "industry", "status"].map((field) => (
          <div key={field} className="space-y-1.5">
            <Skeleton width={80} height={12} radius={6} />
            <Skeleton height={43} radius={9} />
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        <Skeleton width={128} height={12} radius={6} />
        <Skeleton height={43} radius={9} />
      </div>
      <Skeleton className="mt-5" width={112} height={36} radius={8} />
    </section>
  );
}

export function CompanyTab() {
  const dispatch = useAppDispatch();
  const company = useAppSelector(selectCompanyProfile);
  const { data: organisation, isError, isLoading } =
    useGetEmployerOrganisationQuery();
  const [updateOrganisation, { isLoading: isSaving }] =
    useUpdateEmployerOrganisationMutation();
  const { data: reference } = useGetEmployerReferenceQuery();

  useEffect(() => {
    if (organisation) {
      dispatch(replaceCompanyProfile(organisation));
    }
  }, [dispatch, organisation]);

  const update =
    (field: keyof typeof company) => (event: ChangeEvent<HTMLInputElement>) =>
      dispatch(
        updateCompanyField({
          field,
          value: event.target.value,
        }),
      );

  const updateValue =
    (field: keyof typeof company) => (value: string) =>
      dispatch(updateCompanyField({ field, value }));

  if (isLoading) {
    return <CompanyTabSkeleton />;
  }

  const save = () => {
    void updateOrganisation({
      legalName: company.legalName,
      businessType: company.businessType,
      industry: company.industry,
    })
      .unwrap()
      .then((updatedCompany) => {
        dispatch(replaceCompanyProfile(updatedCompany));
        dispatch(saveCompanyProfile());
      })
      .catch(() => undefined);
  };

  const businessTypeOptions = [
    { value: "", label: "Not specified" },
    ...(reference?.employer_types ?? []).map((item) => ({
      value: item.code,
      label: item.label,
    })),
  ];

  const industryOptions = [
    { value: "", label: "Not specified" },
    ...(reference?.industries ?? []).map((item) => ({
      value: item.code,
      label: item.label,
    })),
  ];

  return (
    <section className="max-w-[600px] rounded-xl border border-[#e0e4e9] bg-white p-5 shadow-[0_1px_2px_rgba(17,24,39,0.02)]">
      <div className="mb-3">
        <h2 className="m-0 text-[13px] font-bold leading-[18px]">
          Company profile
        </h2>
        <p className="mt-0.5 text-xs leading-4 text-[#718096]">
          Details used for verification and on your job listings
        </p>
      </div>

      {isError && (
        <ErrorState className="mb-3" fallback="Unable to load company details. Please try again." />
      )}

      <Field label="Legal business name">
        <input
          value={company.legalName}
          onChange={update("legalName")}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="GSTIN">
          <input
            value={company.gstin}
            placeholder="Not returned by organisation API"
            disabled
            readOnly
            className={inputClass}
          />
        </Field>

        <Field label="Business type">
          <AppSelect
            value={company.businessType}
            onChange={updateValue("businessType")}
            options={businessTypeOptions}
            placeholder="Not specified"
            ariaLabel="Business type"
            className={selectClass}
          />
        </Field>

        <Field label="Industry">
          <AppSelect
            value={company.industry}
            onChange={updateValue("industry")}
            options={industryOptions}
            placeholder="Not specified"
            ariaLabel="Industry"
            className={selectClass}
            searchable
            searchPlaceholder="Search industries"
          />
        </Field>
      </div>

      <Field label="Verification status">
        <input
          value={company.kybStatus}
          placeholder="Not specified"
          disabled
          readOnly
          className={inputClass}
        />
      </Field>

      <Field label="Registered address">
          <input
            value={company.address}
            placeholder="Not returned by organisation API"
            disabled
            readOnly
          className={inputClass}
        />
      </Field>

      <button
        type="button"
        className="inline-flex min-h-9 items-center justify-center gap-1.5 cursor-pointer rounded-lg border border-[#5a4bd1] bg-[#5b4ed0] px-3.5 text-xs font-bold text-white hover:bg-[#4f43bd] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving || !company.legalName.trim()}
        aria-busy={isSaving || undefined}
        onClick={save}
      >
        {isSaving && (
          <Loader2 aria-hidden="true" size={14} className="animate-spin" />
        )}
        {isSaving ? "Saving…" : "Save changes"}
      </button>
    </section>
  );
}
