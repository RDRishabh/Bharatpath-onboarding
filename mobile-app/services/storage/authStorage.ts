import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthSession } from '@/services/api/auth';
import { CandidateScoreResponse } from '@/services/api/scoring';

const SESSION_KEY = '@bharatpath:auth_session';
const CANDIDATE_NAME_KEY = '@bharatpath:candidate_name';
const CANDIDATE_SCORE_KEY = '@bharatpath:candidate_score';

export async function saveStoredSession(session: AuthSession): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn('[Storage] Failed to save auth session:', error);
  }
}

export async function getStoredSession(): Promise<AuthSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch (error) {
    console.warn('[Storage] Failed to retrieve auth session:', error);
    return null;
  }
}

export async function clearStoredSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.warn('[Storage] Failed to remove auth session:', error);
  }
}

export async function saveStoredCandidateName(name: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CANDIDATE_NAME_KEY, name);
  } catch (error) {
    console.warn('[Storage] Failed to save candidate name:', error);
  }
}

export async function getStoredCandidateName(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CANDIDATE_NAME_KEY);
  } catch (error) {
    console.warn('[Storage] Failed to retrieve candidate name:', error);
    return null;
  }
}

export async function saveStoredCandidateScore(score: CandidateScoreResponse): Promise<void> {
  try {
    await AsyncStorage.setItem(CANDIDATE_SCORE_KEY, JSON.stringify(score));
  } catch (error) {
    console.warn('[Storage] Failed to save candidate score:', error);
  }
}

export async function getStoredCandidateScore(): Promise<CandidateScoreResponse | null> {
  try {
    const raw = await AsyncStorage.getItem(CANDIDATE_SCORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CandidateScoreResponse;
  } catch (error) {
    console.warn('[Storage] Failed to retrieve candidate score:', error);
    return null;
  }
}

export async function clearAllAuthData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      SESSION_KEY,
      CANDIDATE_NAME_KEY,
      CANDIDATE_SCORE_KEY,
    ]);
  } catch (error) {
    console.warn('[Storage] Failed to clear auth storage:', error);
  }
}
