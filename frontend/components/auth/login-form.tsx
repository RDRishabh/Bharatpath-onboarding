"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  QrCode,
  ShieldCheck,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ErrorState } from "@/components/ui";
import { PORTAL_TYPES, PortalType } from "@/config/portal";
import {
  LoginFormValues,
  loginSchema,
} from "@/features/auth/schemas/login.schema";
import { authService } from "@/features/auth/services/auth.service";
import {
  CognitoPoolType,
  confirmNewPasswordCognito,
  confirmSignUpCognito,
  confirmTotpCodeCognito,
  formatCognitoError,
  resendSignUpCodeCognito,
  signInWithCognito,
  verifyTotpSetupCognito,
} from "@/lib/auth/cognito";
import { setStoredToken } from "@/lib/auth/token";
import { baseApi } from "@/store/api/base-api";
import { setUser } from "@/store/common/slices/auth.slice";
import { setTenant } from "@/store/common/slices/tenant.slice";
import { useAppDispatch } from "@/store/hooks";

const portalTypeByName: Record<string, PortalType> = {
  student: PORTAL_TYPES.STUDENT,
  employer: PORTAL_TYPES.EMPLOYER,
  college: PORTAL_TYPES.COLLEGE,
  admin: PORTAL_TYPES.ADMIN,
};

type AuthStep =
  | "CREDENTIALS"
  | "NEW_PASSWORD"
  | "TOTP_CODE"
  | "TOTP_SETUP"
  | "CONFIRM_SIGN_UP";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  const [pool, setPool] = useState<CognitoPoolType>("CANDIDATE");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [authStep, setAuthStep] = useState<AuthStep>("CREDENTIALS");
  const [submittingChallenge, setSubmittingChallenge] = useState(false);

  // Challenge states
  const [newPassword, setNewPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const sessionTimedOut = searchParams.get("session") === "timeout";
  const [showSessionExpiredToast, setShowSessionExpiredToast] = useState(false);

  useEffect(() => {
    if (!sessionTimedOut) {
      return;
    }

    setShowSessionExpiredToast(true);
    router.replace("/login", { scroll: false });
  }, [router, sessionTimedOut]);

  useEffect(() => {
    if (!showSessionExpiredToast) {
      return;
    }

    const timeout = window.setTimeout(
      () => setShowSessionExpiredToast(false),
      5_000,
    );
    return () => window.clearTimeout(timeout);
  }, [showSessionExpiredToast]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: searchParams.get("email") ?? "",
      password: "",
      pool: "CANDIDATE",
    },
  });

  const enteredEmail = watch("email");

  const handlePoolChange = (nextPool: CognitoPoolType) => {
    setPool(nextPool);
    setValue("pool", nextPool);
    setServerError("");
    setAuthStep("CREDENTIALS");
  };

  /**
   * Complete login session with a valid Cognito access token
   */
  const completeSessionWithToken = async (
    accessToken: string,
    emailAddress: string,
  ) => {
    setStoredToken(accessToken);

    const result = await authService.loginWithToken(
      accessToken,
      emailAddress,
      pool,
    );

    // A different person may have used this browser; drop their cached
    // responses (a stale `has_access` would fire paywalled calls -> 402).
    dispatch(baseApi.util.resetApiState());
    dispatch(
      setUser({
        ...result.user,
        backendRole: result.backendRole,
      }),
    );
    dispatch(
      setTenant({
        portal: portalTypeByName[result.portal] ?? null,
        tenantId: result.user.tenantId ?? null,
        tenantSlug: null,
        tenantName: null,
      }),
    );

    router.replace(result.path);
  };

  const onSubmit = async (values: LoginFormValues) => {
    setServerError("");

    try {
      const result = await signInWithCognito({
        email: values.email,
        password: values.password,
        pool,
      });

      if (result.status === "COMPLETE") {
        await completeSessionWithToken(result.accessToken, values.email);
        return;
      }

      if (result.status === "NEW_PASSWORD_REQUIRED") {
        setAuthStep("NEW_PASSWORD");
        return;
      }

      if (result.status === "TOTP_REQUIRED") {
        setAuthStep("TOTP_CODE");
        return;
      }

      if (result.status === "TOTP_SETUP_REQUIRED") {
        setTotpSecret(result.sharedSecret);
        try {
          const qr = await QRCode.toDataURL(result.setupUri, {
            margin: 2,
            width: 200,
          });
          setQrCodeDataUrl(qr);
        } catch {
          setQrCodeDataUrl(null);
        }
        setAuthStep("TOTP_SETUP");
        return;
      }

      if (result.status === "CONFIRM_SIGN_UP_REQUIRED") {
        setAuthStep("CONFIRM_SIGN_UP");
        return;
      }
    } catch (error) {
      setServerError(formatCognitoError(error));
    }
  };

  const handleConfirmNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setServerError("Password must be at least 8 characters.");
      return;
    }

    setSubmittingChallenge(true);
    setServerError("");
    try {
      const result = await confirmNewPasswordCognito(newPassword, enteredEmail);
      if (result.status === "COMPLETE") {
        await completeSessionWithToken(result.accessToken, enteredEmail);
      } else if (result.status === "TOTP_REQUIRED") {
        setAuthStep("TOTP_CODE");
      } else if (result.status === "TOTP_SETUP_REQUIRED") {
        setTotpSecret(result.sharedSecret);
        const qr = await QRCode.toDataURL(result.setupUri, {
          margin: 2,
          width: 200,
        });
        setQrCodeDataUrl(qr);
        setAuthStep("TOTP_SETUP");
      }
    } catch (err) {
      setServerError(formatCognitoError(err));
    } finally {
      setSubmittingChallenge(false);
    }
  };

  const handleConfirmTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode || totpCode.trim().length !== 6) {
      setServerError("Please enter a valid 6-digit TOTP code.");
      return;
    }

    setSubmittingChallenge(true);
    setServerError("");
    try {
      const result = await confirmTotpCodeCognito(totpCode);
      if (result.status === "COMPLETE") {
        await completeSessionWithToken(result.accessToken, enteredEmail);
      }
    } catch (err) {
      setServerError(formatCognitoError(err));
    } finally {
      setSubmittingChallenge(false);
    }
  };

  const handleVerifyTotpSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode || totpCode.trim().length !== 6) {
      setServerError("Please enter the 6-digit verification code from your authenticator app.");
      return;
    }

    setSubmittingChallenge(true);
    setServerError("");
    try {
      const result = await verifyTotpSetupCognito(totpCode);
      if (result.status === "COMPLETE") {
        await completeSessionWithToken(result.accessToken, enteredEmail);
      }
    } catch (err) {
      setServerError(formatCognitoError(err));
    } finally {
      setSubmittingChallenge(false);
    }
  };

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationCode || confirmationCode.trim().length < 4) {
      setServerError("Please enter the confirmation code sent to your email.");
      return;
    }

    setSubmittingChallenge(true);
    setServerError("");
    try {
      await confirmSignUpCognito(enteredEmail, confirmationCode);
      setAuthStep("CREDENTIALS");
      setServerError("");
      alert("Email confirmed successfully! You can now sign in with your password.");
    } catch (err) {
      setServerError(formatCognitoError(err));
    } finally {
      setSubmittingChallenge(false);
    }
  };

  const handleResendCode = async () => {
    try {
      await resendSignUpCodeCognito(enteredEmail);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    } catch (err) {
      setServerError(formatCognitoError(err));
    }
  };

  const handleCopySecret = async () => {
    if (!totpSecret) return;
    try {
      await navigator.clipboard.writeText(totpSecret);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <div className="space-y-5">
      {/* Pool Selector Tabs */}
      <div className="flex rounded-xl bg-[#f0f2f6] p-1 text-sm font-medium text-[#4b5563]">
        <button
          type="button"
          onClick={() => handlePoolChange("CANDIDATE")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 transition ${
            pool === "CANDIDATE"
              ? "bg-white font-semibold text-[#17233a] shadow-sm"
              : "hover:text-[#111827]"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Candidate Pool</span>
        </button>
        <button
          type="button"
          onClick={() => handlePoolChange("BUSINESS")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 transition ${
            pool === "BUSINESS"
              ? "bg-white font-semibold text-[#17233a] shadow-sm"
              : "hover:text-[#111827]"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>Business Pool</span>
        </button>
      </div>

      {/* Pool Context Badge */}
      <div className="flex items-center justify-between rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2 text-[12px] text-[#4b5563]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-[#3566b8]" />
          <span>
            {pool === "CANDIDATE"
              ? "Students & Job Seekers (Cognito Pool)"
              : "Employers, Colleges & Admins (Cognito Pool · MFA)"}
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#6b7280]">ap-south-1</span>
      </div>

      {serverError && <ErrorState message={serverError} />}

      {/* Primary Credentials Form */}
      {authStep === "CREDENTIALS" && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-[#303747]"
            >
              Email address
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9aa2b1]"
                aria-hidden="true"
              />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={
                  pool === "CANDIDATE"
                    ? "candidate@example.com"
                    : "employer@example.com"
                }
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
                className="h-11 w-full rounded-lg border border-[#dfe2e8] bg-white pl-10 pr-3 text-sm text-[#17233a] outline-none transition placeholder:text-[#a0a6b1] focus:border-[#3566b8] focus:ring-2 focus:ring-[#3566b8]/10"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-[#303747]"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9aa2b1]"
                aria-hidden="true"
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
                className="h-11 w-full rounded-lg border border-[#dfe2e8] bg-white pl-10 pr-10 text-sm text-[#17233a] outline-none transition placeholder:text-[#a0a6b1] focus:border-[#3566b8] focus:ring-2 focus:ring-[#3566b8]/10"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa2b1] hover:text-[#4b5563]"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#17233a] text-sm font-semibold text-white transition hover:bg-[#223453] focus:outline-none focus:ring-2 focus:ring-[#3566b8] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {isSubmitting ? "Authenticating with Cognito..." : "Sign in"}
          </button>

          <p className="text-center text-[12px] leading-5 text-[#8790a0]">
            Protected by AWS Cognito. Uses{" "}
            <span className="font-medium text-[#4b5563]">
              {pool === "CANDIDATE" ? "Candidate Pool" : "Business Pool"}
            </span>{" "}
            credentials.
          </p>

          <div className="pt-2 text-center text-[13px] text-[#687386]">
            {pool === "CANDIDATE" ? (
              <p>
                New candidate?{" "}
                <Link
                  href="/signup/student"
                  className="font-semibold text-[#3566b8] hover:text-[#254f96]"
                >
                  Create a candidate account
                </Link>
              </p>
            ) : (
              <p>
                Need an employer account?{" "}
                <Link
                  href="/signup/employer"
                  className="font-semibold text-[#3566b8] hover:text-[#254f96]"
                >
                  Register your organisation
                </Link>
              </p>
            )}
          </div>
        </form>
      )}

      {/* Challenge Step 1: New Password Required */}
      {authStep === "NEW_PASSWORD" && (
        <form onSubmit={handleConfirmNewPassword} className="space-y-4">
          <div className="rounded-lg border border-[#fef3c7] bg-[#fffbeb] p-3 text-sm text-[#92400e]">
            <p className="font-semibold">Temporary Password Detected</p>
            <p className="mt-1 text-xs">
              This account was created with a temporary password. Please set a
              new permanent password to continue.
            </p>
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="mb-1.5 block text-sm font-medium text-[#303747]"
            >
              New Password
            </label>
            <div className="relative">
              <KeyRound
                className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9aa2b1]"
                aria-hidden="true"
              />
              <input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                placeholder="Choose a strong new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-[#dfe2e8] bg-white pl-10 pr-10 text-sm text-[#17233a] outline-none transition placeholder:text-[#a0a6b1] focus:border-[#3566b8] focus:ring-2 focus:ring-[#3566b8]/10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa2b1] hover:text-[#4b5563]"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-[#6b7280]">
              Must include at least 14 chars, uppercase, lowercase, number and symbol.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAuthStep("CREDENTIALS")}
              className="h-11 flex-1 rounded-lg border border-[#dfe2e8] bg-white text-sm font-semibold text-[#4b5563] hover:bg-[#f9fafb]"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submittingChallenge}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#17233a] text-sm font-semibold text-white hover:bg-[#223453] disabled:opacity-60"
            >
              {submittingChallenge && <Loader2 className="h-4 w-4 animate-spin" />}
              Set & Continue
            </button>
          </div>
        </form>
      )}

      {/* Challenge Step 2: TOTP Code Verification */}
      {authStep === "TOTP_CODE" && (
        <form onSubmit={handleConfirmTotp} className="space-y-4">
          <div className="rounded-lg border border-[#e0e7ff] bg-[#eef2ff] p-3 text-sm text-[#3730a3]">
            <p className="font-semibold">Two-Factor Authentication Required</p>
            <p className="mt-1 text-xs">
              Enter the 6-digit verification code from your authenticator app.
            </p>
          </div>

          <div>
            <label
              htmlFor="totpCode"
              className="mb-1.5 block text-sm font-medium text-[#303747]"
            >
              Authenticator Code (6 digits)
            </label>
            <input
              id="totpCode"
              type="text"
              maxLength={6}
              placeholder="123456"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              className="h-12 w-full rounded-lg border border-[#dfe2e8] bg-white text-center font-mono text-xl tracking-[0.3em] text-[#17233a] outline-none transition focus:border-[#3566b8] focus:ring-2 focus:ring-[#3566b8]/10"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAuthStep("CREDENTIALS")}
              className="h-11 flex-1 rounded-lg border border-[#dfe2e8] bg-white text-sm font-semibold text-[#4b5563] hover:bg-[#f9fafb]"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submittingChallenge || totpCode.length !== 6}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#17233a] text-sm font-semibold text-white hover:bg-[#223453] disabled:opacity-60"
            >
              {submittingChallenge && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify Code
            </button>
          </div>
        </form>
      )}

      {/* Challenge Step 3: Setup TOTP Authenticator */}
      {authStep === "TOTP_SETUP" && (
        <form onSubmit={handleVerifyTotpSetup} className="space-y-4">
          <div className="rounded-lg border border-[#e0e7ff] bg-[#eef2ff] p-3 text-sm text-[#3730a3]">
            <p className="font-semibold">Set Up Authenticator App (MFA)</p>
            <p className="mt-1 text-xs">
              Scan this QR code with Google Authenticator, 1Password, or Authy,
              then enter the generated 6-digit code.
            </p>
          </div>

          {qrCodeDataUrl ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-[#e5e7eb] bg-white p-3">
              <img
                src={qrCodeDataUrl}
                alt="Authenticator QR Code"
                className="h-44 w-44 rounded-lg"
              />
              <p className="mt-2 text-[11px] text-[#6b7280]">
                Scan with your authenticator app
              </p>
            </div>
          ) : null}

          {totpSecret && (
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3">
              <div className="flex items-center justify-between text-xs text-[#6b7280]">
                <span>Can&apos;t scan? Enter secret key:</span>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="flex items-center gap-1 font-medium text-[#3566b8] hover:underline"
                >
                  {codeCopied ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy key
                    </>
                  )}
                </button>
              </div>
              <p className="mt-1 font-mono text-[13px] font-semibold text-[#111827] select-all">
                {totpSecret}
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="verifyTotp"
              className="mb-1.5 block text-sm font-medium text-[#303747]"
            >
              Enter 6-digit code from app
            </label>
            <input
              id="verifyTotp"
              type="text"
              maxLength={6}
              placeholder="000000"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              className="h-12 w-full rounded-lg border border-[#dfe2e8] bg-white text-center font-mono text-xl tracking-[0.3em] text-[#17233a] outline-none transition focus:border-[#3566b8] focus:ring-2 focus:ring-[#3566b8]/10"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAuthStep("CREDENTIALS")}
              className="h-11 flex-1 rounded-lg border border-[#dfe2e8] bg-white text-sm font-semibold text-[#4b5563] hover:bg-[#f9fafb]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingChallenge || totpCode.length !== 6}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#17233a] text-sm font-semibold text-white hover:bg-[#223453] disabled:opacity-60"
            >
              {submittingChallenge && <Loader2 className="h-4 w-4 animate-spin" />}
              Complete Setup
            </button>
          </div>
        </form>
      )}

      {/* Challenge Step 4: Confirm Sign-up Code */}
      {authStep === "CONFIRM_SIGN_UP" && (
        <form onSubmit={handleConfirmSignUp} className="space-y-4">
          <div className="rounded-lg border border-[#fef3c7] bg-[#fffbeb] p-3 text-sm text-[#92400e]">
            <p className="font-semibold">Confirm Your Email Address</p>
            <p className="mt-1 text-xs">
              Cognito sent a confirmation code to {enteredEmail}. Enter it below
              to activate your account.
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmationCode"
              className="mb-1.5 block text-sm font-medium text-[#303747]"
            >
              Email Confirmation Code
            </label>
            <input
              id="confirmationCode"
              type="text"
              placeholder="Verification code"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              className="h-11 w-full rounded-lg border border-[#dfe2e8] bg-white px-3 font-mono text-sm text-[#17233a] outline-none transition focus:border-[#3566b8] focus:ring-2 focus:ring-[#3566b8]/10"
            />
          </div>

          {resendSuccess && (
            <p className="text-xs text-green-600">
              A new verification code was sent to your email.
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResendCode}
              className="h-11 flex-1 rounded-lg border border-[#dfe2e8] bg-white text-xs font-semibold text-[#4b5563] hover:bg-[#f9fafb]"
            >
              Resend Code
            </button>
            <button
              type="submit"
              disabled={submittingChallenge}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#17233a] text-sm font-semibold text-white hover:bg-[#223453] disabled:opacity-60"
            >
              {submittingChallenge && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Account
            </button>
          </div>
        </form>
      )}

      {/* Session Expired Toast */}
      {showSessionExpiredToast ? (
        <div
          className="fixed right-5 top-5 z-110 flex w-[min(26rem,calc(100vw-2.5rem))] items-start gap-3 rounded-2xl border border-[#f2d3a0] bg-white p-4 text-[#613b08] shadow-[0_18px_50px_rgba(23,35,58,0.2)]"
          role="alert"
          aria-live="assertive"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fff4df] text-[#ad6b0b]">
            <AlertCircle size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold">Session expired</p>
            <p className="mt-0.5 text-[12px] leading-5 text-[#765a31]">
              Sign in again to continue.
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss session expired message"
            onClick={() => setShowSessionExpiredToast(false)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#8c744f] transition hover:bg-[#fff4df]"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
