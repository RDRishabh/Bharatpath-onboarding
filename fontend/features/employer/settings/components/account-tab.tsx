"use client";

import type { ChangeEvent } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectAccountProfile,
  updateAccountField,
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

export function AccountTab() {
  const dispatch = useAppDispatch();
  const account = useAppSelector(selectAccountProfile);

  const update = (
    field: "fullName" | "phone",
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    dispatch(
      updateAccountField({
        field,
        value: event.target.value,
      }),
    );
  };

  return (
    <section className="max-w-[488px] rounded-xl border border-[#e0e4e9] bg-white p-5 shadow-[0_1px_2px_rgba(17,24,39,0.02)]">
      <div className="mb-3">
        <h2 className="m-0 text-[13px] font-bold leading-[18px]">
          Account &amp; security
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Full name">
          <input
            value={account.fullName}
            onChange={(event) => update("fullName", event)}
            className={inputClass}
          />
        </Field>

        <Field label="Phone number">
          <input
            value={account.phone}
            onChange={(event) => update("phone", event)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Work email">
        <input
          value={account.workEmail}
          disabled
          readOnly
          className={inputClass}
        />
      </Field>

      <button
        type="button"
        className="mt-1 min-h-9 cursor-pointer rounded-lg border border-[#d6dbe2] bg-white px-3.5 text-xs font-bold text-[#172033]"
      >
        Change password
      </button>

      <div className="mt-3.5 flex min-h-[37px] items-center gap-2.5 rounded-[9px] bg-[#e8f5ef] px-3 text-[10px] text-[#15825e]">
        <span>▣</span>
        <span>
          Two-factor authentication enabled via authenticator app
        </span>
      </div>
    </section>
  );
}
