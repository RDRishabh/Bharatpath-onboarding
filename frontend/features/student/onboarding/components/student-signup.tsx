"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { FormSkeleton } from "@/components/common/loading";
import { PORTAL_TYPES } from "@/config/portal";
import { authService } from "@/features/auth/services/auth.service";
import type { LoginResponse } from "@/features/auth/types";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api/error-message";
import { clearStoredToken, setStoredToken } from "@/lib/auth/token";
import { baseApi } from "@/store/api/base-api";
import { notificationApi } from "@/store/api/notification-api";
import { clearUser, setUser } from "@/store/common/slices/auth.slice";
import { clearTenant, setTenant } from "@/store/common/slices/tenant.slice";
import { useAppDispatch } from "@/store/hooks";
import {
  studentApi,
  useCompleteResumeUploadMutation,
  useCreateResumeUploadMutation,
  useLazyGetResumeVersionsQuery,
  useGetCollegeConsentTermsQuery,
  useLinkStudentCollegeByReferralMutation,
  useUploadResumeFileMutation,
  type ManualResume,
} from "@/store/student";

import { parseFailureMessage } from "../constants";
import { AccountStep, LocationStep } from "./account-steps";
import { ComputingStep } from "./computing-step";
import {
  IntakeStep,
  ManualStep,
  PasteStep,
  resumeFileProblem,
} from "./intake-steps";
import { ParsingStep, type UploadPhase } from "./parsing-step";
import { ReviewStep } from "./review-step";
import { SubscriptionStep } from "./subscription-step";
import { SignupFrame, TrustAside, type SignupPhase } from "./ui";

type Stage =
  | { name: "booting" }
  | { name: "account" }
  | { name: "referral"; code: string }
  | { name: "location" }
  | { name: "subscription" }
  | { name: "intake"; error?: string }
  | { name: "paste" }
  | { name: "manual"; initial?: ManualResume; editOf?: string }
  | {
      name: "parsing";
      fileName: string;
      fileSize: number;
      phase: UploadPhase;
      resumeFileId?: string;
      /** Kept when completing failed, so the check can be retried. */
      uploadId?: string;
      error?: string;
    }
  | { name: "review"; resumeVersionId: string }
  | { name: "computing"; confirmedAt: string | null };

const PHASE_OF: Record<Stage["name"], SignupPhase> = {
  booting: "start",
  account: "start",
  referral: "start",
  location: "start",
  subscription: "subscription",
  intake: "resume",
  paste: "resume",
  manual: "resume",
  parsing: "resume",
  review: "review",
  computing: "score",
};

interface Profile {
  fullName: string;
  city: string;
  stateCode: string;
}

const EMPTY_PROFILE: Profile = { fullName: "", city: "", stateCode: "" };

/**
 * Candidate sign-up: account, about you, resume intake, reading, review and confirm, scoring -
 * then the existing score screen takes over.
 */
export function StudentSignup() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [stage, setStage] = useState<Stage>({ name: "booting" });
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);

  const [loadProfile] = studentApi.endpoints.getStudentProfile.useLazyQuery();
  const [loadVersions] = useLazyGetResumeVersionsQuery();
  const [createUpload] = useCreateResumeUploadMutation();
  const [uploadFile] = useUploadResumeFileMutation();
  const [completeUpload] = useCompleteResumeUploadMutation();
  const [linkCollege] = useLinkStudentCollegeByReferralMutation();
  const [saveStudentName] = studentApi.endpoints.updateStudentName.useMutation();

  const go = (next: Stage) => {
    setStage(next);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const remember = (identity: LoginResponse, email?: string) => {
    dispatch(
      setUser({
        ...identity.user,
        email: identity.user.email || email || "",
        name: identity.user.name || email || "",
      }),
    );
    dispatch(
      setTenant({
        portal: PORTAL_TYPES.STUDENT,
        tenantId: null,
        tenantSlug: null,
        tenantName: null,
      }),
    );
  };

  /** Where a signed-in candidate picks up: name, then resume, then score. */
  const resume = async (): Promise<Stage> => {
    const current = await loadProfile(undefined, false).unwrap();
    const known: Profile = {
      fullName: current.fullName ?? "",
      city: current.city ?? "",
      stateCode: current.stateCode ?? "",
    };
    setProfile(known);

    if (!known.fullName) return { name: "intake" };

    const versions = await loadVersions(undefined, false).unwrap();
    const latest = versions.find((version) => !version.superseded);

    if (!latest) return { name: "intake" };
    if (latest.confirmed) return { name: "computing", confirmedAt: latest.confirmedAt };
    return { name: "review", resumeVersionId: latest.resumeVersionId };
  };

  useEffect(() => {
    let cancelled = false;

    authService
      .me()
      .then(async (identity) => {
        if (cancelled) return;
        if (identity.backendRole !== "CANDIDATE") {
          setStage({ name: "account" });
          return;
        }
        remember(identity);
        setSignedIn(true);
        const next = await resume();
        if (!cancelled) setStage(next);
      })
      .catch(() => {
        if (!cancelled) setStage({ name: "account" });
      });

    return () => {
      cancelled = true;
    };
    // Runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetCaches = () => {
    dispatch(baseApi.util.resetApiState());
    dispatch(notificationApi.util.resetApiState());
  };

  const signOut = async () => {
    try {
      await authService.logout();
    } catch {
      /* the cookie expires anyway */
    }
    clearStoredToken();
    dispatch(clearUser());
    dispatch(clearTenant());
    resetCaches();
    setSignedIn(false);
    setProfile(EMPTY_PROFILE);
    go({ name: "account" });
  };

  const startUpload = async (file: File) => {
    go({ name: "parsing", fileName: file.name, fileSize: file.size, phase: "uploading" });

    let uploadId: string;
    try {
      const ticket = await createUpload().unwrap();
      const problem = resumeFileProblem(file, ticket.maxBytes);
      if (problem) {
        go({ name: "intake", error: problem });
        return;
      }

      await uploadFile({ ticket, file }).unwrap();
      uploadId = ticket.uploadId;
    } catch (error) {
      go({
        name: "intake",
        error: getApiErrorMessage(error, "The upload did not finish. Please try again."),
      });
      return;
    }

    await finishUpload(uploadId, file.name, file.size);
  };

  /**
   * Completing an upload is idempotent, so a failure here is retried on the
   * same upload rather than making the candidate send the file again.
   */
  const finishUpload = async (uploadId: string, fileName: string, fileSize: number) => {
    setStage({ name: "parsing", fileName, fileSize, phase: "checking" });

    try {
      const accepted = await completeUpload(uploadId).unwrap();
      setStage({
        name: "parsing",
        fileName,
        fileSize,
        phase: "reading",
        resumeFileId: accepted.resumeFileId,
      });
    } catch (error) {
      const code = getApiErrorCode(error);

      // The file itself was refused: another upload is the only remedy.
      if (code?.startsWith("upload_") || code === "resume_upload_rejected") {
        go({ name: "intake", error: parseFailureMessage(code) });
        return;
      }

      setStage({
        name: "parsing",
        fileName,
        fileSize,
        phase: "checking",
        uploadId,
        error: getApiErrorMessage(error, "We could not check your file. Please try again."),
      });
    }
  };

  const phase = PHASE_OF[stage.name];
  const frame = (content: React.ReactNode, aside?: React.ReactNode) => (
    <SignupFrame
      phase={phase}
      aside={aside}
      signedIn={signedIn}
      onSignOut={() => void signOut()}
    >
      {content}
    </SignupFrame>
  );

  switch (stage.name) {
    case "booting":
      return frame(<FormSkeleton fields={3} bordered={false} />);

    case "account":
      return frame(
        <AccountStep
          onSignedUp={async (result, email, referralCode, fullName) => {
            if (result.token) setStoredToken(result.token);
            // A different person may have been signed in on this browser.
            resetCaches();
            remember(result, email);
            setSignedIn(true);
            const normalizedName = fullName.split(/\s+/).join(" ").trim();
            setProfile((current) => ({ ...current, fullName: normalizedName }));
            await saveStudentName(normalizedName).unwrap();

            if (referralCode) {
              go({ name: "referral", code: referralCode });
            } else {
              go({ name: "location" });
            }
          }}
        />,
      );

    case "referral":
      return frame(
        <ReferralConsentStep
          code={stage.code}
          linkCollege={(code, consentVersion) =>
            linkCollege({ code, consentVersion }).unwrap()
          }
          onDone={() => go({ name: "location" })}
        />,
      );

    case "location":
      return frame(
        <LocationStep
          initial={profile}
          onDone={() => go({ name: "subscription" })}
        />,
      );

    case "subscription":
      return frame(
        <SubscriptionStep
          onBack={() => go({ name: "location" })}
          onContinue={() => go({ name: "intake" })}
        />,
        <TrustAside />,
      );

    case "intake":
      return frame(
        <IntakeStep
          error={stage.error}
          onBack={() => go({ name: "subscription" })}
          onFile={(file) => void startUpload(file)}
          onPaste={() => go({ name: "paste" })}
          onForm={() => go({ name: "manual" })}
        />,
      );

    case "paste":
      return frame(
        <PasteStep
          onBack={() => go({ name: "intake" })}
          onCreated={(resumeVersionId) => go({ name: "review", resumeVersionId })}
        />,
      );

    case "manual":
      return frame(
        <ManualStep
          initial={stage.initial}
          editOf={stage.editOf}
          defaultName={profile.fullName}
          onBack={() =>
            go(
              stage.editOf
                ? { name: "review", resumeVersionId: stage.editOf }
                : { name: "intake" },
            )
          }
          onCreated={(resumeVersionId) => go({ name: "review", resumeVersionId })}
        />,
      );

    case "parsing":
      return frame(
        <ParsingStep
          key={stage.resumeFileId ?? stage.fileName}
          fileName={stage.fileName}
          fileSize={stage.fileSize}
          phase={stage.phase}
          resumeFileId={stage.resumeFileId}
          error={stage.error}
          onRetry={
            stage.uploadId
              ? () => {
                  const { uploadId, fileName, fileSize } = stage;
                  if (uploadId) void finishUpload(uploadId, fileName, fileSize);
                }
              : undefined
          }
          onReview={(resumeVersionId) => go({ name: "review", resumeVersionId })}
          onTryAnother={() => go({ name: "intake" })}
          onPaste={() => go({ name: "paste" })}
        />,
      );

    case "review":
      return frame(
        <ReviewStep
          key={stage.resumeVersionId}
          resumeVersionId={stage.resumeVersionId}
          onConfirmed={(confirmedAt) => go({ name: "computing", confirmedAt })}
          onEditStructured={(initial, editOf) => go({ name: "manual", initial, editOf })}
          onStartOver={() => go({ name: "intake" })}
        />,
      );

    case "computing":
      return frame(
        <ComputingStep
          confirmedAt={stage.confirmedAt}
          onShowScore={() => router.push("/student/score")}
          onGoHome={() => router.push("/student")}
        />,
      );
  }
}

function ReferralConsentStep({ code, linkCollege, onDone }: {
  code: string;
  linkCollege: (code: string, consentVersion: string) => Promise<unknown>;
  onDone: () => void;
}) {
  const terms = useGetCollegeConsentTermsQuery("ROSTER");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function accept() {
    if (!terms.data) return;
    setBusy(true); setError(null);
    try {
      await linkCollege(code, terms.data.consent_version);
      onDone();
    } catch (linkError) {
      setError(getApiErrorMessage(linkError, "The college referral code could not be applied."));
      if (getApiErrorCode(linkError) === "consent_version_outdated") void terms.refetch();
    } finally { setBusy(false); }
  }

  return <div className="flex flex-col gap-6">
    <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5F4DB2]">College referral</p><h1 className="mt-2 text-2xl font-bold text-[#0A1931]">Link your college?</h1><p className="mt-2 text-sm leading-6 text-[#5F6B80]">You entered <strong className="font-mono text-[#0A1931]">{code}</strong>. Referral codes link your student account to a college; they do not change payment prices.</p></div>
    <section className="rounded-2xl border border-[#E7E0D4] bg-[#FFFCF7] p-4 text-sm leading-6 text-[#3A4761]">{terms.isLoading ? "Loading consent terms…" : terms.data?.text ?? "The consent terms could not be loaded."}</section>
    {(error || terms.error) && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error ?? getApiErrorMessage(terms.error, "The consent terms could not be loaded.")}</div>}
    <div className="flex gap-3"><button type="button" onClick={onDone} className="flex-1 rounded-full border border-[#E7E0D4] px-4 py-3 text-sm font-semibold text-[#0A1931]">Skip for now</button><button type="button" disabled={!terms.data || busy} onClick={() => void accept()} className="flex-[2] rounded-full bg-[#5F4DB2] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Linking…" : "Agree and link college"}</button></div>
  </div>;
}
