"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button, SelectDropdown } from "@/components/ui";
import { INSTITUTION_TYPES } from "@/features/college/onboarding/institution-types";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { showAdminFeedback } from "@/store/admin";
import {
  useProvisionAdminCandidateMutation,
  useProvisionAdminCollegeMutation,
  useProvisionAdminEmployerMutation,
} from "@/store/api/admin-api";
import { useGetEmployerReferenceQuery } from "@/store/employer/settings/settings.api";
import { useAppDispatch } from "@/store/hooks";

import type { UserSegment } from "../types";

interface CreateUserDrawerProps {
  /** Fixes which kind of account this drawer creates. */
  segment: UserSegment;
  onClose: () => void;
}

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-[#dfe2e8] bg-white px-3 text-[13px] text-[#172033] outline-none transition-colors placeholder:text-[#98a0ae] focus:border-[#315c9f]";

const COPY = {
  candidates: {
    title: "Invite candidate",
    description:
      "Creates the candidate's account and emails them a temporary password, valid for 7 days.",
  },
  employers: {
    title: "Invite employer",
    description:
      "Creates the organisation and its owner. The owner still completes KYB and subscribes.",
  },
  institutions: {
    title: "Invite institution",
    description:
      "Creates the institution and its administrator. They complete onboarding and subscribe themselves.",
  },
} satisfies Record<UserSegment, { title: string; description: string }>;

const EMAIL_LABEL = {
  candidates: "Email address",
  employers: "Owner email",
  institutions: "Administrator email",
} satisfies Record<UserSegment, string>;

export function CreateUserDrawer({ segment, onClose }: CreateUserDrawerProps) {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [employerType, setEmployerType] = useState("");
  const [industry, setIndustry] = useState("");
  const [institutionType, setInstitutionType] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [provisionCandidate, candidateState] = useProvisionAdminCandidateMutation();
  const [provisionEmployer, employerState] = useProvisionAdminEmployerMutation();
  const [provisionCollege, collegeState] = useProvisionAdminCollegeMutation();
  const reference = useGetEmployerReferenceQuery(undefined, {
    skip: segment !== "employers",
  });
  const isLoading =
    candidateState.isLoading || employerState.isLoading || collegeState.isLoading;
  const copy = COPY[segment];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLoading, onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (segment === "institutions" && !institutionType) {
      setSubmitError("Select an institution type.");
      return;
    }

    try {
      let invitation: "SENT" | "ALREADY_REGISTERED";
      if (segment === "candidates") {
        ({ invitation } = await provisionCandidate({ email: email.trim() }).unwrap());
      } else if (segment === "employers") {
        ({ invitation } = await provisionEmployer({
          owner_email: email.trim(),
          legal_name: name.trim(),
          ...(employerType ? { employer_type: employerType } : {}),
          ...(industry ? { industry } : {}),
        }).unwrap());
      } else {
        ({ invitation } = await provisionCollege({
          admin_email: email.trim(),
          name: name.trim(),
          institution_type: institutionType,
        }).unwrap());
      }
      dispatch(
        showAdminFeedback(
          invitation === "SENT"
            ? "Account created. A temporary password was emailed."
            : "Account created. They already have a sign-in, so no email was sent.",
        ),
      );
      onClose();
    } catch (error) {
      setSubmitError(
        getApiErrorMessage(error, "The account could not be created. Please try again."),
      );
    }
  }

  const employerTypes = reference.data?.employer_types ?? [];
  const industries = reference.data?.industries ?? [];

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
        aria-label={copy.title}
        className="absolute right-0 top-0 flex h-full w-[480px] max-w-full flex-col bg-white shadow-[-20px_0_60px_-24px_rgba(0,0,0,0.5)]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#e5e7eb] px-5 py-4">
          <div>
            <h2 className="text-[18px] font-bold text-[#172033]">{copy.title}</h2>
            <p className="mt-1 text-[12px] text-[#7b8494]">{copy.description}</p>
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            {segment !== "candidates" ? (
              <Field label={segment === "employers" ? "Legal name" : "Institution name"}>
                <input
                  autoFocus
                  required
                  minLength={2}
                  maxLength={255}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={segment === "employers" ? "Acme Private Limited" : "Institution name"}
                  className={INPUT_CLASS}
                />
              </Field>
            ) : null}

            <Field label={EMAIL_LABEL[segment]}>
              <input
                autoFocus={segment === "candidates"}
                required
                type="email"
                maxLength={320}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                className={INPUT_CLASS}
              />
            </Field>

            {segment === "employers" ? (
              <>
                <Field label="Employer type (optional)">
                  <select
                    value={employerType}
                    onChange={(event) => setEmployerType(event.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value="">Not specified</option>
                    {employerTypes.map((item) => (
                      <option key={item.code} value={item.code}>{item.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Industry (optional)">
                  <select
                    value={industry}
                    onChange={(event) => setIndustry(event.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value="">Not specified</option>
                    {industries.map((item) => (
                      <option key={item.code} value={item.code}>{item.label}</option>
                    ))}
                  </select>
                </Field>
              </>
            ) : null}

            {segment === "institutions" ? (
              <Field label="Institution type">
                <SelectDropdown
                  value={institutionType}
                  onChange={setInstitutionType}
                  options={INSTITUTION_TYPES}
                  placeholder="Select institution type"
                  ariaLabel="Institution type"
                  containerClassName="w-full"
                  className="rounded-lg focus:border-[#315c9f] focus:ring-[#315c9f]/20"
                />
              </Field>
            ) : null}

            {submitError ? (
              <p
                role="alert"
                className="rounded-lg border border-[#f1c0c0] bg-[#fff5f5] px-3 py-2 text-[12px] text-[#9f2d2d]"
              >
                {submitError}
              </p>
            ) : null}
          </div>

          <footer className="flex justify-end gap-2 border-t border-[#e5e7eb] p-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="dark" isLoading={isLoading} loadingText="Sending…">
              {copy.title}
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
