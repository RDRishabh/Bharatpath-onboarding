"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, KeyRound, Lock, Mail, MapPin, User } from "lucide-react";

import { AppSelect } from "@/components/ui/app-select";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { showSuccessFeedback } from "@/lib/feedback/success-feedback";
import {
  passwordError,
  useSignupFlow,
} from "@/features/auth/hooks/use-signup-flow";
import type { SignupResponse } from "@/features/auth/types";
import {
  useUpdateStudentLocationMutation,
  useUpdateStudentNameMutation,
} from "@/store/student";

import { INDIAN_STATES } from "../constants";
import {
  ErrorNote,
  Field,
  fieldBorder,
  fieldClass,
  LockNote,
  PillButton,
  StepHeader,
} from "./ui";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* -------------------------------------------------------------------------
 * 13 Create account - email and password, confirmed by a code emailed by
 * Cognito (the client has deferred phone OTP and SMS).
 * ---------------------------------------------------------------------- */
interface AccountStepProps {
  onBack: () => void;
  onSignedUp: (result: SignupResponse, email: string, referralCode: string) => Promise<void>;
}

export function AccountStep({ onBack, onSignedUp }: Readonly<AccountStepProps>) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const flow = useSignupFlow("CANDIDATE", async (session, signedUpEmail) => {
    showSuccessFeedback("Your account is ready.");
    await onSignedUp(session, signedUpEmail, referralCode.trim().toUpperCase());
  });

  const submitDetails = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const next = {
      email: EMAIL_PATTERN.test(email.trim()) ? undefined : "Enter a valid email address.",
      password: passwordError(password),
    };
    setErrors(next);
    if (next.email || next.password) return;

    void flow.register(email.trim(), password);
  };

  const submitCode = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void flow.confirm(code.trim());
  };

  const errorNote = flow.error ? (
    <ErrorNote
      action={
        flow.existingAccount ? (
          <Link
            href={`/login?email=${encodeURIComponent(email.trim())}`}
            className="w-fit font-semibold text-[#0A1931] underline underline-offset-2 transition-colors hover:text-[#5F4DB2]"
          >
            Sign in instead
          </Link>
        ) : null
      }
    >
      {flow.error}
    </ErrorNote>
  ) : null;

  if (flow.phase === "CONFIRM") {
    return (
      <form onSubmit={submitCode} noValidate className="flex flex-col gap-6">
        <StepHeader
          step="account"
          title="Check your email"
          subtitle={`We sent a confirmation code to ${flow.email}.`}
        />

        {errorNote}
        {flow.notice && <p className="m-0 text-[13px] text-green-700">{flow.notice}</p>}

        <Field id="signup-code" label="Confirmation code">
          <div className="relative">
            <KeyRound
              className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#3A4761]"
              aria-hidden="true"
            />
            <input
              id="signup-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="Code from your email"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className={`${fieldClass} ${fieldBorder(false)} pl-12 text-[17px] font-semibold`}
            />
          </div>
        </Field>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <PillButton variant="secondary" onClick={flow.back} className="flex-1">
              Back
            </PillButton>
            <PillButton
              type="submit"
              isLoading={flow.busy}
              disabled={code.trim().length < 4}
              className="flex-[2]"
            >
              {flow.busy ? "Confirming…" : "Confirm"}
            </PillButton>
          </div>
          <PillButton variant="ghost" onClick={() => void flow.resend()} disabled={flow.busy}>
            Resend code
          </PillButton>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submitDetails} noValidate className="flex flex-col gap-6">
      <StepHeader
        step="account"
        title="Your email address"
        subtitle="We'll use it to sign you in and to tell you when your score is ready."
      />

      {errorNote}

      <Field id="signup-email" label="Email" error={errors.email}>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#3A4761]"
            aria-hidden="true"
          />
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            value={email}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "signup-email-error" : undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((current) => ({ ...current, email: undefined }));
            }}
            className={`${fieldClass} ${fieldBorder(Boolean(errors.email))} pl-12 text-[17px] font-semibold`}
          />
        </div>
      </Field>

      <Field
        id="signup-password"
        label="Password"
        hint="At least 14 characters, with uppercase, lowercase, a number and a symbol."
        error={errors.password}
      >
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#3A4761]"
            aria-hidden="true"
          />
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder="Choose a strong password"
            value={password}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "signup-password-error" : "signup-password-hint"}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrors((current) => ({ ...current, password: undefined }));
            }}
            className={`${fieldClass} ${fieldBorder(Boolean(errors.password))} pl-12`}
          />
        </div>
      </Field>

      <Field
        id="signup-referral-code"
        label="College referral code (optional)"
        hint="If your college gave you a code, enter it here. This is separate from a payment discount code."
      >
        <div className="relative">
          <GraduationCap className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#3A4761]" aria-hidden="true" />
          <input
            id="signup-referral-code"
            autoComplete="off"
            placeholder="ABCD-EFGH-JKMN"
            value={referralCode}
            maxLength={32}
            onChange={(event) => setReferralCode(event.target.value.toUpperCase())}
            className={`${fieldClass} ${fieldBorder(false)} pl-12 font-mono uppercase`}
          />
        </div>
      </Field>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <PillButton variant="secondary" onClick={onBack} className="flex-1">
            Back
          </PillButton>
          <PillButton type="submit" isLoading={flow.busy} className="flex-[2]">
            {flow.busy ? "Creating your account…" : "Continue"}
          </PillButton>
        </div>
        <p className="m-0 text-center text-[12px] leading-4 text-[#5F6B80]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#0A1931] underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------
 * About you - name (asked at sign-up, blockers E13) and declared location.
 * ---------------------------------------------------------------------- */
const NAME_PATTERN = /^[\p{L}\p{M} .'-]+$/u;
const HAS_LETTER = /\p{L}/u;

function nameError(value: string): string | undefined {
  const name = value.split(/\s+/).join(" ").trim();
  if (!name) return "Enter your name.";
  if (name.length > 200) return "Use 200 characters or fewer.";
  if (!NAME_PATTERN.test(name) || !HAS_LETTER.test(name)) {
    return "Use letters, spaces and . ' - only.";
  }
  return undefined;
}

function cityError(value: string): string | undefined {
  const city = value.split(/\s+/).join(" ").trim();
  if (!city) return undefined;
  if (city.length > 100) return "Use 100 characters or fewer.";
  if (!NAME_PATTERN.test(city) || !HAS_LETTER.test(city)) {
    return "A city is letters, spaces and . ' - only.";
  }
  return undefined;
}

interface AboutStepProps {
  initial: { fullName: string; city: string; stateCode: string };
  onBack?: () => void;
  onDone: () => void;
}

const selectClass =
  "[&>button]:h-[54px] [&>button]:rounded-[16px] [&>button]:border-[1.5px] [&>button]:border-[#E7E0D4] [&>button]:bg-white [&>button]:px-4 [&>button>span]:text-[16px] [&>button>span]:font-medium [&>button>span]:text-[#0A1931] [&_[role=option]]:text-[13px]";

export function AboutStep({ initial, onBack, onDone }: Readonly<AboutStepProps>) {
  const [fullName, setFullName] = useState(initial.fullName);
  const [city, setCity] = useState(initial.city);
  const [stateCode, setStateCode] = useState(initial.stateCode);
  const [errors, setErrors] = useState<{ fullName?: string; city?: string }>({});
  const [serverError, setServerError] = useState<unknown>(null);

  const [saveName, nameState] = useUpdateStudentNameMutation();
  const [saveLocation, locationState] = useUpdateStudentLocationMutation();
  const saving = nameState.isLoading || locationState.isLoading;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    const nextErrors = { fullName: nameError(fullName), city: cityError(city) };
    setErrors(nextErrors);
    if (nextErrors.fullName || nextErrors.city) return;

    try {
      await saveName(fullName.split(/\s+/).join(" ").trim()).unwrap();
      const trimmedCity = city.split(/\s+/).join(" ").trim();
      if (trimmedCity || stateCode || initial.city || initial.stateCode) {
        await saveLocation({
          city: trimmedCity || null,
          stateCode: stateCode || null,
        }).unwrap();
      }
      showSuccessFeedback("Your details are saved.");
      onDone();
    } catch (error) {
      setServerError(error);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <StepHeader
        step="about"
        title="A little about you"
        subtitle="Your name is shown to an employer only after you apply. Your city helps employers near you find you."
      />

      {serverError ? (
        <ErrorNote>
          {getApiErrorMessage(serverError, "We could not save your details. Please try again.")}
        </ErrorNote>
      ) : null}

      <Field id="signup-name" label="Full name" hint="As it appears on your resume." error={errors.fullName}>
        <div className="relative">
          <User
            className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#3A4761]"
            aria-hidden="true"
          />
          <input
            id="signup-name"
            autoComplete="name"
            autoFocus
            placeholder="e.g. Priya Deshmukh"
            value={fullName}
            maxLength={200}
            aria-invalid={Boolean(errors.fullName)}
            onChange={(event) => {
              setFullName(event.target.value);
              setErrors((current) => ({ ...current, fullName: undefined }));
            }}
            className={`${fieldClass} ${fieldBorder(Boolean(errors.fullName))} pl-12`}
          />
        </div>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="signup-city" label="City or town" optional error={errors.city}>
          <div className="relative">
            <MapPin
              className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#3A4761]"
              aria-hidden="true"
            />
            <input
              id="signup-city"
              autoComplete="address-level2"
              placeholder="e.g. Pune"
              value={city}
              maxLength={100}
              aria-invalid={Boolean(errors.city)}
              onChange={(event) => {
                setCity(event.target.value);
                setErrors((current) => ({ ...current, city: undefined }));
              }}
              className={`${fieldClass} ${fieldBorder(Boolean(errors.city))} pl-12`}
            />
          </div>
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-[#0A1931]">
            State
            <span className="ml-1.5 font-normal text-[#5F6B80]">Optional</span>
          </span>
          <AppSelect
            value={stateCode}
            onChange={setStateCode}
            options={[
              { value: "", label: "Select a state" },
              ...INDIAN_STATES.map((state) => ({ value: state.code, label: state.name })),
            ]}
            placeholder="Select a state"
            ariaLabel="State"
            className={selectClass}
            searchable
            searchPlaceholder="Search states"
          />
        </div>
      </div>

      <p className="m-0 text-[12px] leading-4 text-[#5F6B80]">
        Just the city — never your address or PIN code.
      </p>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {onBack && (
            <PillButton variant="secondary" onClick={onBack} className="flex-1">
              Back
            </PillButton>
          )}
          <PillButton type="submit" isLoading={saving} className="flex-[2]">
            Continue
          </PillButton>
        </div>
        <LockNote>Only used to build your profile</LockNote>
      </div>
    </form>
  );
}
