import { Amplify } from "aws-amplify";
import {
  confirmSignIn,
  confirmSignUp,
  fetchAuthSession,
  resendSignUpCode,
  setUpTOTP,
  signIn,
  signOut,
  verifyTOTPSetup,
} from "aws-amplify/auth";

export type CognitoPoolType = "CANDIDATE" | "BUSINESS";

export interface CognitoConfig {
  region: string;
  candidatePoolId: string;
  candidateClientId: string;
  businessPoolId: string;
  businessClientId: string;
}

export const COGNITO_CONFIG: CognitoConfig = {
  region: process.env.NEXT_PUBLIC_COGNITO_REGION ?? "ap-south-1",
  candidatePoolId:
    process.env.NEXT_PUBLIC_COGNITO_CANDIDATE_USER_POOL_ID ??
    "ap-south-1_afBHHXfyH",
  candidateClientId:
    process.env.NEXT_PUBLIC_COGNITO_CANDIDATE_CLIENT_ID ??
    "2bpl99ukq9mjalvku2r9rha80u",
  businessPoolId:
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ??
    process.env.NEXT_PUBLIC_COGNITO_BUSINESS_USER_POOL_ID ??
    "ap-south-1_w1u6W6fTP",
  businessClientId:
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ??
    process.env.NEXT_PUBLIC_COGNITO_BUSINESS_CLIENT_ID ??
    "3fomv3e9agld2mvrbhaj52vsfm",
};

let activeConfiguredPool: CognitoPoolType | null = null;

export function configureAmplify(pool: CognitoPoolType = "CANDIDATE"): void {
  if (typeof window === "undefined") {
    return;
  }

  const isCandidate = pool === "CANDIDATE";
  const userPoolId = isCandidate
    ? COGNITO_CONFIG.candidatePoolId
    : COGNITO_CONFIG.businessPoolId;
  const userPoolClientId = isCandidate
    ? COGNITO_CONFIG.candidateClientId
    : COGNITO_CONFIG.businessClientId;

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          email: true,
        },
      },
    },
  });

  activeConfiguredPool = pool;
}

export interface CognitoSignInParams {
  email: string;
  password: string;
  pool: CognitoPoolType;
}

export type CognitoSignInResult =
  | {
      status: "COMPLETE";
      accessToken: string;
      idToken?: string;
    }
  | {
      status: "NEW_PASSWORD_REQUIRED";
    }
  | {
      status: "TOTP_REQUIRED";
    }
  | {
      status: "TOTP_SETUP_REQUIRED";
      sharedSecret: string;
      setupUri: string;
    }
  | {
      status: "CONFIRM_SIGN_UP_REQUIRED";
    };

export function formatCognitoError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Authentication failed. Please check your credentials.";
  }

  const err = error as { name?: string; message?: string };
  const name = err.name ?? "";
  const msg = err.message ?? "";

  switch (name) {
    case "UserNotFoundException":
      return "No account found with this email in the selected pool. Please check your account type or sign up.";
    case "NotAuthorizedException":
      return "Incorrect email or password. Please verify your credentials.";
    case "UserNotConfirmedException":
      return "Your account email is not yet confirmed. Please verify your code.";
    case "PasswordResetRequiredException":
      return "Your password has expired or must be reset before signing in.";
    case "LimitExceededException":
    case "TooManyRequestsException":
      return "Too many attempts. Please wait a moment and try again.";
    case "InvalidParameterException":
      return msg || "Invalid email or password format.";
    case "CodeMismatchException":
      return "Invalid verification code. Please check and try again.";
    case "ExpiredCodeException":
      return "Verification code has expired. Please request a new code.";
    case "EnableSoftwareTokenMFAException":
      return "Could not enable authenticator app MFA. Please try again.";
    default:
      return msg || "Sign-in failed. Please try again.";
  }
}

export async function fetchCognitoAccessToken(): Promise<string> {
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();
  if (!token) {
    throw new Error("Unable to retrieve access token from Cognito session.");
  }
  return token;
}

export async function signInWithCognito({
  email,
  password,
  pool,
}: CognitoSignInParams): Promise<CognitoSignInResult> {
  configureAmplify(pool);

  const trimmedEmail = email.trim();
  const response = await signIn({
    username: trimmedEmail,
    password,
  });

  const { nextStep } = response;

  if (nextStep.signInStep === "DONE") {
    const accessToken = await fetchCognitoAccessToken();
    const session = await fetchAuthSession();
    return {
      status: "COMPLETE",
      accessToken,
      idToken: session.tokens?.idToken?.toString(),
    };
  }

  if (nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
    return { status: "NEW_PASSWORD_REQUIRED" };
  }

  if (nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_TOTP_CODE") {
    return { status: "TOTP_REQUIRED" };
  }

  if (nextStep.signInStep === "CONTINUE_SIGN_IN_WITH_TOTP_SETUP") {
    const totpDetails = await setUpTOTP();
    const setupUri = totpDetails.getSetupUri("BharatPath", trimmedEmail);
    return {
      status: "TOTP_SETUP_REQUIRED",
      sharedSecret: totpDetails.sharedSecret,
      setupUri: setupUri.toString(),
    };
  }

  if (nextStep.signInStep === "CONFIRM_SIGN_UP") {
    return { status: "CONFIRM_SIGN_UP_REQUIRED" };
  }

  throw new Error(`Unsupported authentication step: ${nextStep.signInStep}`);
}

export async function confirmNewPasswordCognito(
  newPassword: string,
  email?: string,
): Promise<CognitoSignInResult> {
  const response = await confirmSignIn({
    challengeResponse: newPassword,
  });

  const { nextStep } = response;
  if (nextStep.signInStep === "DONE") {
    const accessToken = await fetchCognitoAccessToken();
    return { status: "COMPLETE", accessToken };
  }

  if (nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_TOTP_CODE") {
    return { status: "TOTP_REQUIRED" };
  }

  if (nextStep.signInStep === "CONTINUE_SIGN_IN_WITH_TOTP_SETUP") {
    const totpDetails = await setUpTOTP();
    const setupUri = totpDetails.getSetupUri("BharatPath", email ?? "User");
    return {
      status: "TOTP_SETUP_REQUIRED",
      sharedSecret: totpDetails.sharedSecret,
      setupUri: setupUri.toString(),
    };
  }

  throw new Error(`Unsupported step after password reset: ${nextStep.signInStep}`);
}

export async function confirmTotpCodeCognito(
  totpCode: string,
): Promise<CognitoSignInResult> {
  const response = await confirmSignIn({
    challengeResponse: totpCode.trim(),
  });

  if (response.nextStep.signInStep === "DONE") {
    const accessToken = await fetchCognitoAccessToken();
    return { status: "COMPLETE", accessToken };
  }

  throw new Error(`Unsupported step after TOTP code: ${response.nextStep.signInStep}`);
}

export async function verifyTotpSetupCognito(
  code: string,
): Promise<CognitoSignInResult> {
  await verifyTOTPSetup({
    code: code.trim(),
  });

  const accessToken = await fetchCognitoAccessToken();
  return { status: "COMPLETE", accessToken };
}

export async function confirmSignUpCognito(
  email: string,
  confirmationCode: string,
): Promise<void> {
  await confirmSignUp({
    username: email.trim(),
    confirmationCode: confirmationCode.trim(),
  });
}

export async function resendSignUpCodeCognito(email: string): Promise<void> {
  await resendSignUpCode({
    username: email.trim(),
  });
}

export async function signOutCognito(): Promise<void> {
  try {
    await signOut();
  } catch {
    // Ignore sign-out failures
  }
}
