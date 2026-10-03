/**
 * BharatPath - useProfileViews hook
 *
 * Cursor-paginated loader for the candidate's profile views / unlocks
 * (`GET /candidate/profile/views`).
 *
 * Shows which organisations opened the candidate's profile in the last 90 days.
 * Never the recruiter and no count of opens.
 * `total` is always null on the backend.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getProfileViews } from '@/services/api/profile';
import { ApiError } from '@/services/api/client';
import { ProfileViewItem } from '@/types/user';

export interface UseProfileViewsResult {
  /** All profile view events loaded so far across pages. */
  views: ProfileViewItem[];
  /** True while the initial page is loading. */
  loading: boolean;
  /** True while an additional page is loading (infinite scroll). */
  loadingMore: boolean;
  /** True while a pull-to-refresh is in flight. */
  refreshing: boolean;
  /** True when next_cursor is null - no more pages. */
  hasReachedEnd: boolean;
  /** Error message from the last failed load, or null. */
  error: string | null;
  /** Load the next page, if one exists. */
  loadMore: () => void;
  /** Reload the first page. */
  reload: () => Promise<void>;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.problem.title || error.problem.code || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function useProfileViews(): UseProfileViewsResult {
  const [views, setViews] = useState<ProfileViewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextCursorRef = useRef<string | null>(null);
  const loadTokenRef = useRef(0);

  const loadFirstPage = useCallback(async (isRefresh = false) => {
    const token = ++loadTokenRef.current;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const page = await getProfileViews({ limit: 50 });
      if (token !== loadTokenRef.current) return;
      setViews(page.items || []);
      nextCursorRef.current = page.next_cursor;
      setHasReachedEnd(!page.next_cursor);
    } catch (err) {
      if (token !== loadTokenRef.current) return;
      setError(errorMessage(err, 'Could not load profile views.'));
    } finally {
      if (token === loadTokenRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadFirstPage(false);
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    const cursor = nextCursorRef.current;
    if (!cursor || loading || loadingMore || hasReachedEnd) return;

    const token = loadTokenRef.current;
    setLoadingMore(true);

    try {
      const page = await getProfileViews({ cursor, limit: 50 });
      if (token !== loadTokenRef.current) return;
      setViews((prev) => [...prev, ...(page.items || [])]);
      nextCursorRef.current = page.next_cursor;
      setHasReachedEnd(!page.next_cursor);
    } catch (err) {
      if (token !== loadTokenRef.current) return;
      // Soft failure on paging
      console.warn('[useProfileViews] Failed to load more views:', err);
    } finally {
      if (token === loadTokenRef.current) {
        setLoadingMore(false);
      }
    }
  }, [loading, loadingMore, hasReachedEnd]);

  const reload = useCallback(async () => {
    await loadFirstPage(true);
  }, [loadFirstPage]);

  return {
    views,
    loading,
    loadingMore,
    refreshing,
    hasReachedEnd,
    error,
    loadMore,
    reload,
  };
}
