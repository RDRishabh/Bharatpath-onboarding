/**
 * BharatPath - Courses Service
 * Integrates with Backend /api/v1/candidate/courses endpoints.
 *
 * The catalogue lists courses on sale and which the candidate owns and has
 * completed. A completed course contributes +30 to the score (capped).
 *
 * Pay-first (R13): the catalogue, lesson playback, and checkout need an active
 * subscription. A lapsed subscriber gets 402 ("subscription_required").
 */
import { ApiError, apiRequest } from './client';
import {
  CourseCheckoutResult,
  CourseDetail,
  CourseSummary,
  LessonProgressPayload,
  LessonProgressResult,
} from '@/types/course';

// Backward compatibility alias
export type CourseResponse = CourseSummary;

/**
 * List courses on sale, including purchase state and progress for the current candidate.
 * Behind subscription gate: returns 402 if subscription is missing/lapsed.
 */
export async function listCourses(): Promise<CourseSummary[]> {
  return apiRequest<CourseSummary[]>('/candidate/courses');
}

/**
 * Get full course details including syllabus, modules, and lessons.
 * Media URLs are null if the course is locked.
 */
export async function getCourseDetail(courseId: string): Promise<CourseDetail> {
  return apiRequest<CourseDetail>(`/candidate/courses/${courseId}`);
}

/**
 * Report watching progress for a lesson.
 * Send every ~15 seconds while playing, and on pause/close.
 * The server decides when a lesson counts as watched (reaches 90% and half duration elapsed).
 */
export async function recordLessonProgress(
  courseId: string,
  lessonId: string,
  positionSeconds: number
): Promise<LessonProgressResult> {
  return apiRequest<LessonProgressResult>(
    `/candidate/courses/${courseId}/lessons/${lessonId}/progress`,
    {
      method: 'POST',
      body: { position_seconds: Math.floor(positionSeconds) } as LessonProgressPayload,
    }
  );
}

/**
 * Initiate checkout to buy a course.
 * Returns a payment intent with a redirect_url or stub payment id.
 */
export async function checkoutCourse(courseId: string): Promise<CourseCheckoutResult> {
  return apiRequest<CourseCheckoutResult>(`/candidate/courses/${courseId}/checkout`, {
    method: 'POST',
  });
}

/**
 * Count the candidate's completed courses.
 * Returns 0 on error (including 402) so callers don't fail.
 */
export async function countCompletedCourses(): Promise<number> {
  try {
    const courses = await listCourses();
    return courses.filter((c) => c.completed).length;
  } catch {
    return 0;
  }
}

/** Format seconds into a friendly string (e.g. 600s -> "10 mins", 3660s -> "1h 1m"). */
export function formatCourseDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0 min';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes} mins`;
}

/** Format seconds into mm:ss timer format (e.g. 125s -> "02:05"). */
export function formatTimerSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/** Format paise to INR currency string (e.g. 49900 -> "₹499"). */
export function formatPriceINR(paise: number): string {
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString('en-IN')}`;
}

/** Check if an error is 402 Subscription Required */
export function isSubscriptionRequiredError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 402 || error.code === 'subscription_required';
  }
  return false;
}

/** Human-friendly error translation for Courses API failures */
export function coursesErrorMessage(caught: unknown, fallback: string): string {
  if (caught instanceof ApiError) {
    if (caught.status === 402 || caught.code === 'subscription_required') {
      return 'An active BharatPath subscription is required to access courses.';
    }
    if (caught.code === 'course_not_purchased') {
      return 'Please unlock this course to access the lessons.';
    }
    if (caught.code === 'course_already_purchased') {
      return 'You already own this course.';
    }
    if (caught.problem?.title) {
      return caught.problem.title;
    }
  }
  return fallback;
}
