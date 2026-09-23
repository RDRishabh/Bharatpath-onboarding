import { apiRequest, setAccessToken, getAccessToken, ApiError } from './client';
import { UserProfile } from '@/types/user';
import { rememberUnsavedName } from '@/services/profile/pendingName';

export interface AuthSession {
  accessToken: string;
  userId: string;
  email: string;
  role: string;
  pool: string;
  tenantId: string | null;
  subject?: string;
}

export interface MeResponse {
  user_id: string;
  role: string;
  pool: string;
  tenant_id: string | null;
}

export interface DevTokenResponse {
  access_token: string;
  token_type: string;
  subject: string;
  expires_in: number;
}

export interface CandidateProfileResponse {
  full_name: string | null;
  city: string | null;
  state_code: string | null;
  updated_at: string | null;
}

export interface SignUpParams {
  fullName: string;
  email: string;
  password: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

// Known pre-existing dev subjects
const devSubjectCache: Record<string, string> = {
  'onlyritik10@gmail.com': '8a6403bc-e0fb-4c46-92ce-47bd7e66ae40',
  'rohan@gmail.com': '572f5bf9-fa74-439c-b577-f5cbfc3b69e9',
  'rish@gmail.com': 'e891265e-95a5-4547-a218-5130c1e18951',
  'priya.sharma@example.com': '7328bab6-a2ed-41f0-92f1-f1575b48b164',
  'candidate@example.com': '91ff19a0-b40b-4182-80e3-a02a764bcdd6',
  'test_cand_1@example.com': '3a47fc46-bcc2-42f6-93d0-58b15d8aa731',
  'deterministic_test@example.com': '12345678-1234-4234-a234-123456789abc',
};

/**
 * Deterministically derives a consistent UUID for a given email address during local dev.
 * This guarantees that an account created on your phone app can be logged into
 * on your web browser or any other testing device without "Permission Denied" conflicts!
 */
export function emailToDevSubject(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (devSubjectCache[normalized]) {
    return devSubjectCache[normalized];
  }

  // FNV-1a based 128-bit hash formatted as a valid UUID
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  let h3 = 0x811c9dc5;
  let h4 = 0x811c9dc5;

  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ (code + i), 0x01000193);
    h3 = Math.imul(h3 ^ (code * 31), 0x01000193);
    h4 = Math.imul(h4 ^ (code * 17), 0x01000193);
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const hex3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const hex4 = (h4 >>> 0).toString(16).padStart(8, '0');

  const fullHex = hex1 + hex2 + hex3 + hex4;
  const uuid = `${fullHex.slice(0, 8)}-${fullHex.slice(8, 12)}-4${fullHex.slice(13, 16)}-a${fullHex.slice(17, 20)}-${fullHex.slice(20, 32)}`;
  devSubjectCache[normalized] = uuid;
  return uuid;
}

let currentSession: AuthSession | null = null;

/**
 * Sign up a new candidate:
 * 1. Mints a JWT access token for CANDIDATE pool with deterministic subject.
 * 2. Calls GET /auth/me to automatically register user in the backend PostgreSQL table.
 * 3. Calls PUT /candidate/profile/name to save candidate full name.
 */
export async function signUpWithEmail(params: SignUpParams): Promise<AuthSession> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const devSubject = emailToDevSubject(normalizedEmail);

  // Mint local dev token
  const tokenResponse = await apiRequest<DevTokenResponse>('/auth/dev/token', {
    method: 'POST',
    body: {
      pool: 'CANDIDATE',
      email: normalizedEmail,
      subject: devSubject,
    },
  });

  const accessToken = tokenResponse.access_token;
  setAccessToken(accessToken);

  // 1. Verify identity and initialize user row in backend DB
  const me = await apiRequest<MeResponse>('/auth/me', {
    token: accessToken,
  });

  // 2. Store the candidate's name. This is the only place it is captured, so
  // a failure here leaves the account with no name anywhere — it is retried
  // once and then handed to `rememberUnsavedName` so the next profile read
  // can save it, rather than being logged and lost.
  const fullName = params.fullName.trim();
  if (fullName) {
    const saveName = () =>
      apiRequest<CandidateProfileResponse>('/candidate/profile/name', {
        method: 'PUT',
        token: accessToken,
        body: { full_name: fullName },
      });
    try {
      await saveName();
    } catch (first) {
      console.warn('Retrying candidate name save after failure:', first);
      try {
        await saveName();
      } catch (second) {
        console.error('Could not save candidate name during signup:', second);
        rememberUnsavedName(fullName);
      }
    }
  }

  const session: AuthSession = {
    accessToken,
    userId: me.user_id,
    email: normalizedEmail,
    role: me.role,
    pool: me.pool,
    tenantId: me.tenant_id,
    subject: tokenResponse.subject,
  };

  currentSession = session;
  return session;
}

/**
 * Sign in existing candidate:
 * 1. Uses deterministic subject so the identity matches across Phone, Web & Simulator.
 * 2. Obtains verified access token from /auth/dev/token.
 * 3. Verifies identity via GET /auth/me.
 * 4. Fetches candidate profile from GET /candidate/profile.
 */
export async function signInWithEmail(params: SignInParams): Promise<{
  session: AuthSession;
  profile: CandidateProfileResponse | null;
}> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const devSubject = emailToDevSubject(normalizedEmail);

  const tokenResponse = await apiRequest<DevTokenResponse>('/auth/dev/token', {
    method: 'POST',
    body: {
      pool: 'CANDIDATE',
      email: normalizedEmail,
      subject: devSubject,
    },
  });

  const accessToken = tokenResponse.access_token;
  setAccessToken(accessToken);

  // Verify identity
  const me = await apiRequest<MeResponse>('/auth/me', {
    token: accessToken,
  });

  // Fetch candidate profile
  let profile: CandidateProfileResponse | null = null;
  try {
    profile = await apiRequest<CandidateProfileResponse>('/candidate/profile', {
      token: accessToken,
    });
  } catch (err) {
    console.warn('Could not fetch candidate profile:', err);
  }

  const session: AuthSession = {
    accessToken,
    userId: me.user_id,
    email: normalizedEmail,
    role: me.role,
    pool: me.pool,
    tenantId: me.tenant_id,
    subject: tokenResponse.subject,
  };

  currentSession = session;
  return { session, profile };
}

/**
 * Confirm Sign-up with 6-digit code (Cognito flow).
 */
export async function confirmSignUpWithCode(_email: string, _code: string): Promise<boolean> {
  return true;
}

/**
 * Get current caller's identity directly from backend (/auth/me)
 */
export async function getMe(): Promise<MeResponse | null> {
  const token = getAccessToken();
  if (!token) return null;
  try {
    return await apiRequest<MeResponse>('/auth/me');
  } catch {
    return null;
  }
}

/**
 * Update candidate full name (PUT /candidate/profile/name)
 */
export async function updateCandidateName(fullName: string): Promise<CandidateProfileResponse> {
  return await apiRequest<CandidateProfileResponse>('/candidate/profile/name', {
    method: 'PUT',
    body: {
      full_name: fullName.trim(),
    },
  });
}

/**
 * Update candidate location (PUT /candidate/profile/location)
 */
export async function updateCandidateLocation(
  city: string | null,
  stateCode: string | null
): Promise<CandidateProfileResponse> {
  return await apiRequest<CandidateProfileResponse>('/candidate/profile/location', {
    method: 'PUT',
    body: {
      city: city ? city.trim() : null,
      state_code: stateCode ? stateCode.trim().toUpperCase() : null,
    },
  });
}

/**
 * Get candidate's own profile (GET /candidate/profile)
 */
export async function getCandidateProfile(): Promise<CandidateProfileResponse> {
  return await apiRequest<CandidateProfileResponse>('/candidate/profile');
}

export async function signOut(): Promise<void> {
  setAccessToken(null);
  currentSession = null;
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  return currentSession;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const cand = await getCandidateProfile();
    return {
      id: userId,
      fullName: cand.full_name || 'Candidate',
      email: currentSession?.email || '',
      city: cand.city || undefined,
      state: cand.state_code || undefined,
      preferredLanguage: 'en',
      education: [],
      skills: [],
      experience: [],
      readinessScore: 706,
      readinessBand: 1,
    };
  } catch {
    return null;
  }
}
