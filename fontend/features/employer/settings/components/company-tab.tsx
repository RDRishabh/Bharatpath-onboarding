"use client";

import type { ChangeEvent } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  saveCompanyProfile,
  selectCompanyProfile,
  updateCompanyField,
} from "@/store/employer/settings";

const inputClass =
  "min-h-[43px] w-full rounded-[9px] border border-[#dfe4ea] bg-white px-3.5 text-[13px] text-[#111827] outline-none transition focus:border-[#526cc8] focus:ring-4 focus:ring-[#526cc8]/10 disabled:bg-[#f1f3f5] disabled:text-[#687385]";

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

export function CompanyTab() {
  const dispatch = useAppDispatch();
  const company = useAppSelector(selectCompanyProfile);

  const update =
    (field: keyof typeof company) => (event: ChangeEvent<HTMLInputElement>) =>
      dispatch(
        updateCompanyField({
          field,
          value: event.target.value,
        }),
      );

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
            onChange={update("gstin")}
            className={inputClass}
          />
        </Field>

        <Field label="Business type">
          <input
            value={company.businessType}
            disabled
            readOnly
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Registered address">
        <input
          value={company.address}
          onChange={update("address")}
          className={inputClass}
        />
      </Field>

      <button
        type="button"
        className="min-h-9 cursor-pointer rounded-lg border border-[#5a4bd1] bg-[#5b4ed0] px-3.5 text-xs font-bold text-white hover:bg-[#4f43bd]"
        onClick={() => dispatch(saveCompanyProfile())}
      >
        Save changes
      </button>
    </section>
  );
}
