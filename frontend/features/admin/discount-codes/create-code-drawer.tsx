"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button, SelectDropdown } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { showAdminFeedback } from "@/store/admin";
import {
  type CreateDiscountCodeRequest,
  type DiscountAudience,
  useCreateAdminDiscountCodeMutation,
} from "@/store/api/admin-api";
import { useAppDispatch } from "@/store/hooks";

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-[#dfe2e8] bg-white px-3 text-[13px] text-[#172033] outline-none transition-colors placeholder:text-[#98a0ae] focus:border-[#315c9f]";

const AUDIENCES = [
  { value: "CANDIDATE", label: "Candidate" },
  { value: "EMPLOYER", label: "Employer" },
  { value: "COLLEGE", label: "College" },
];

const KINDS = [
  { value: "percent", label: "Percentage" },
  { value: "amount", label: "Fixed amount" },
];

const DROPDOWN_CLASS = "rounded-lg focus:border-[#315c9f] focus:ring-[#315c9f]/20";

export function CreateCodeDrawer({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [create, { isLoading }] = useCreateAdminDiscountCodeMutation();
  const [audience, setAudience] = useState<DiscountAudience>("CANDIDATE");
  const [kind, setKind] = useState<"percent" | "amount">("percent");
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [label, setLabel] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLoading, onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const amount = Number(value);
    const payload: CreateDiscountCodeRequest = { audience };
    if (code.trim()) payload.code = code.trim().toUpperCase();
    if (label.trim()) payload.label = label.trim();
    if (usageLimit) payload.usage_limit = Number(usageLimit);
    if (validFrom) payload.valid_from = new Date(validFrom).toISOString();
    if (validUntil) payload.valid_until = new Date(validUntil).toISOString();
    if (kind === "percent") payload.percent_off = amount;
    else payload.amount_off_minor = Math.round(amount * 100);

    try {
      const created = await create(payload).unwrap();
      dispatch(showAdminFeedback(`Discount code ${created.code} created.`));
      onClose();
    } catch (mutationError) {
      setError(getApiErrorMessage(mutationError, "The discount code could not be created."));
    }
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close"
        disabled={isLoading}
        onClick={onClose}
        className="absolute inset-0 bg-[#172033]/30"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Create discount code"
        className="absolute right-0 top-0 flex h-full w-[480px] max-w-full flex-col bg-white shadow-[-20px_0_60px_-24px_rgba(0,0,0,0.5)]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#e5e7eb] px-5 py-4">
          <div>
            <h2 className="text-[18px] font-bold text-[#172033]">Create discount code</h2>
            <p className="mt-1 text-[12px] text-[#7b8494]">
              A code&apos;s terms can&apos;t be edited afterwards. To change one, disable it and make another.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#7b8494] hover:bg-[#f5f6f8]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            <Field label="Audience">
              <SelectDropdown
                value={audience}
                onChange={(next) => setAudience(next as DiscountAudience)}
                options={AUDIENCES}
                ariaLabel="Audience"
                className={DROPDOWN_CLASS}
              />
            </Field>

            <Field label="Code (optional)">
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                minLength={4}
                maxLength={32}
                placeholder="Leave blank to generate one"
                className={`${INPUT_CLASS} uppercase`}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Discount type">
                <SelectDropdown
                  value={kind}
                  onChange={(next) => {
                    setKind(next as "percent" | "amount");
                    setValue("");
                  }}
                  options={KINDS}
                  ariaLabel="Discount type"
                  className={DROPDOWN_CLASS}
                />
              </Field>
              <Field label={kind === "percent" ? "Percent off (1–99)" : "Amount off (₹)"}>
                <input
                  required
                  type="number"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  min={kind === "percent" ? 1 : 0.01}
                  max={kind === "percent" ? 99 : undefined}
                  step={kind === "percent" ? 1 : 0.01}
                  placeholder={kind === "percent" ? "e.g. 20" : "e.g. 100"}
                  className={INPUT_CLASS}
                />
              </Field>
            </div>

            <Field label="Usage limit (optional)">
              <input
                type="number"
                min={1}
                value={usageLimit}
                onChange={(event) => setUsageLimit(event.target.value)}
                placeholder="Unlimited"
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Label (optional)">
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                maxLength={120}
                placeholder="e.g. Launch promo"
                className={INPUT_CLASS}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Valid from">
                <input
                  type="datetime-local"
                  value={validFrom}
                  onChange={(event) => setValidFrom(event.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Valid until">
                <input
                  type="datetime-local"
                  value={validUntil}
                  onChange={(event) => setValidUntil(event.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-[#f1c0c0] bg-[#fff5f5] px-3 py-2 text-[12px] text-[#9f2d2d]"
              >
                {error}
              </p>
            ) : null}
          </div>

          <footer className="flex justify-end gap-2 border-t border-[#e5e7eb] p-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="dark" isLoading={isLoading} loadingText="Creating…">
              Create code
            </Button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-[#344054]">{label}</span>
      {children}
    </label>
  );
}
