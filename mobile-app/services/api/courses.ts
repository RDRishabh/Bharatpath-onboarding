/**
 * BharatPath — Courses Service
 * Integrates with Backend /api/v1/candidate/courses endpoints.
 *
 * The catalogue lists courses on sale and which the candidate owns and has
 * completed. A completed course contributes +30 to the score (capped), so
 * "completed" is the count the profile screen's "Add-ons" card wants — not
 * "purchased", which is a payment state, not an achievement.
 *
 * Pay-first (R13): the catalogue and checkout need an active subscription.
 * A lapsed subscriber gets 402, which the profile screen treats as "no
 * count" rather than an error, because the card is a convenience.
 */
import { apiRequest } from './client';

export interface CourseResponse {
  id: string;
  code: string;
  title: string;
  price_minor: number;
  purchased: boolean;
  completed: boolean;
}

/**
 * List courses on sale, and which the candidate owns and has completed.
 * Behind the subscription (R13): a 402 is a normal "no count" case here.
 */
export async function listCourses(): Promise<CourseResponse[]> {
  return apiRequest<CourseResponse[]>('/candidate/courses');
}

/**
 * Count the candidate's completed courses.
 *
 * Returns 0 on error (including a 402 from a lapsed subscription) so the
 * profile card never shows a spinner forever.
 */
export async function countCompletedCourses(): Promise<number> {
  try {
    const courses = await listCourses();
    return courses.filter((c) => c.completed).length;
  } catch {
    return 0;
  }
}
