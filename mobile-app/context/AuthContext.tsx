import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AuthSession,
  CandidateProfileResponse,
  getCurrentSession,
  signOut as apiSignOut,
} from '@/services/api/auth';
import { UserProfile } from '@/types/user';

interface AuthContextType {
  session: AuthSession | null;
  profile: UserProfile | null;
  /** `candidate_profiles.full_name`, asked at sign-up. Never a CV guess. */
  candidateFullName: string | null;
  isLoading: boolean;
  setSession: React.Dispatch<React.SetStateAction<AuthSession | null>>;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  setCandidateFullName: React.Dispatch<React.SetStateAction<string | null>>;
  rememberCandidate: (session: AuthSession, profile?: CandidateProfileResponse | null, fullName?: string | null) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [candidateFullName, setCandidateFullName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    getCurrentSession().then((sess) => {
      setSession(sess);
      setIsLoading(false);
    });
  }, []);

  const rememberCandidate = (
    nextSession: AuthSession,
    candidateProfile?: CandidateProfileResponse | null,
    fullName?: string | null
  ) => {
    const resolved =
      (fullName && fullName.trim()) ||
      (candidateProfile?.full_name && candidateProfile.full_name.trim()) ||
      null;
    setSession(nextSession);
    if (resolved) {
      setCandidateFullName(resolved);
      setProfile((current) => ({
        id: nextSession.userId,
        fullName: resolved,
        email: nextSession.email,
        city: candidateProfile?.city || current?.city,
        state: candidateProfile?.state_code || current?.state,
        preferredLanguage: current?.preferredLanguage || 'en',
        education: current?.education || [],
        skills: current?.skills || [],
        experience: current?.experience || [],
        readinessScore: current?.readinessScore ?? 0,
        readinessBand: current?.readinessBand ?? 1,
      }));
    }
  };

  const handleSignOut = async () => {
    await apiSignOut();
    setSession(null);
    setProfile(null);
    setCandidateFullName(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        candidateFullName,
        isLoading,
        setSession,
        setProfile,
        setCandidateFullName,
        rememberCandidate,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
