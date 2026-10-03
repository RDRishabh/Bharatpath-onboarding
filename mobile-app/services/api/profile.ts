/**
 * BharatPath - Candidate Profile & Views Service
 * Integrates with Backend /api/v1/candidate/profile endpoints.
 */
import { apiRequest } from './client';
import { ProfileViewsPage } from '@/types/user';

export interface ProfileViewsQuery {
  cursor?: string | null;
  limit?: number | null;
}

/**
 * Fetch which organisations opened the candidate's profile in the last 90 days.
 * Calls GET /candidate/profile/views.
 *
 * One entry per organisation, its name and when it last looked.
 * Latest first, cursor-paginated.
 */
export async function getProfileViews(
  opts?: ProfileViewsQuery
): Promise<ProfileViewsPage> {
  const params = new URLSearchParams();
  if (opts?.cursor) params.set('cursor', opts.cursor);
  if (opts?.limit != null) params.set('limit', String(opts.limit));
  const qs = params.toString();
  const endpoint = qs ? `/candidate/profile/views?${qs}` : '/candidate/profile/views';
  return apiRequest<ProfileViewsPage>(endpoint);
}
