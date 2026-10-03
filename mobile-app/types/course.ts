/**
 * BharatPath - Course Types
 * Types matching the backend /api/v1/candidate/courses contracts.
 */

export interface CourseSummary {
  id: string;
  code: string;
  title: string;
  price_minor: number; // In paise (e.g. 49900 = ₹499)
  currency: string;
  purchased: boolean;
  completed: boolean;
  locked: boolean; // True until candidate buys the course
  lessons_total: number;
  lessons_completed: number;
  percent_complete: number; // 0 - 100
  contribution_points?: number;
}

export type MediaKind = 'YOUTUBE' | 'UPLOAD';

export interface CourseLesson {
  id: string;
  title: string;
  description: string | null;
  duration_seconds: number;
  media_kind: MediaKind;
  media_url: string | null; // Null while locked; YouTube embed or presigned S3 URL once bought
  position_seconds: number; // Where candidate left off
  completed: boolean;
}

export interface CourseModule {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

export interface CourseDetail extends CourseSummary {
  modules: CourseModule[];
}

export interface LessonProgressPayload {
  position_seconds: number;
}

export interface LessonProgressResult {
  lesson_id: string;
  position_seconds: number;
  completed: boolean;
  lessons_total: number;
  lessons_completed: number;
  percent_complete: number;
  course_completed: boolean;
}

export interface CourseCheckoutResult {
  payment_id: string;
  status: string;
  amount_minor: number;
  list_amount_minor: number | null;
  currency: string;
  redirect_url: string | null;
}
