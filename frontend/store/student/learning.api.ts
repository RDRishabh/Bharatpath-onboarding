import { baseApi } from "@/store/api/base-api";

export type CourseDetail = {
  id: string; title: string; purchased: boolean; locked: boolean; percent_complete: number;
  modules: Array<{ id: string; title: string; lessons: Array<{ id: string; title: string; description: string | null; media_kind: "YOUTUBE" | "UPLOAD"; media_url: string | null; position_seconds: number; duration_seconds: number; completed: boolean }> }>;
};
export type PaymentCheckout = { payment_id: string; redirect_url: string | null; status: string };
export type InterviewHistory = { id: string; session_number: number; state: string; created_at: string; completed_at: string | null; question_set_title: string; questions_asked: number; answers_stored: number; report_status: string };
export type InterviewSession = { id: string; state: string; questions_total: number; questions: Array<{ index: number; prompt: string; preparation_seconds: number; answer_seconds: number }>; answers: Array<{ question_index: number; upload_state: string }> };

export const learningApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCourseDetail: builder.query<CourseDetail, string>({ query: (id) => `/candidate/courses/${id}`, providesTags: ["Student"] }),
    checkoutCourse: builder.mutation<PaymentCheckout, string>({ query: (id) => ({ url: `/candidate/courses/${id}/checkout`, method: "POST" }) }),
    updateLessonProgress: builder.mutation<unknown, { courseId: string; lessonId: string; positionSeconds: number }>({
      query: ({ courseId, lessonId, positionSeconds }) => ({ url: `/candidate/courses/${courseId}/lessons/${lessonId}/progress`, method: "POST", body: { position_seconds: positionSeconds } }),
      invalidatesTags: ["Student"],
    }),
    getInterviewHistory: builder.query<InterviewHistory[], void>({ query: () => "/candidate/interview/history", providesTags: ["Student"] }),
    getInterviewRecordings: builder.query<Array<{ question_index: number; prompt: string; url: string; transcript: string | null }>, string>({ query: (id) => `/candidate/interview/sessions/${id}/recordings` }),
    getInterviewReport: builder.query<{ status: string; failure_reason: string | null; dimensions: Array<{ code: string; label: string; level: string; what_good_looks_like: string }>; questions: Array<{ index: number; prompt: string; looking_for: string; transcript: string; comment: string | null }> }, string>({ query: (id) => `/candidate/interview/sessions/${id}/report` }),
    getApplicationMessages: builder.query<Array<{ id: string; kind: string; body: string; scheduled_at: string | null; link: string | null; employer_name: string | null; created_at: string }>, string>({ query: (id) => `/candidate/applications/${id}/messages` }),
    checkoutInterview: builder.mutation<PaymentCheckout, { acknowledge_no_score_increase: boolean }>({ query: (body) => ({ url: "/candidate/interview/checkout", method: "POST", body }) }),
    checkInterviewDevice: builder.mutation<{ passed: boolean; failures: string[] }, { mic_ok: boolean; audio_out_ok: boolean; quiet_env_ok: boolean; network_kbps?: number }>({ query: (body) => ({ url: "/candidate/interview/device-checks", method: "POST", body }), invalidatesTags: ["Student"] }),
    startInterview: builder.mutation<InterviewSession, void>({ query: () => ({ url: "/candidate/interview/sessions", method: "POST" }), invalidatesTags: ["Student"] }),
    getInterviewSession: builder.query<InterviewSession, string>({ query: (id) => `/candidate/interview/sessions/${id}`, providesTags: ["Student"] }),
    getInterviewUpload: builder.mutation<{ url: string; accepted_types: string[]; max_bytes: number; max_duration_ms: number }, { id: string; index: number }>({ query: ({ id, index }) => ({ url: `/candidate/interview/sessions/${id}/answers/${index}/upload`, method: "POST" }) }),
    completeInterviewAnswer: builder.mutation<unknown, { id: string; index: number; durationMs: number }>({ query: ({ id, index, durationMs }) => ({ url: `/candidate/interview/sessions/${id}/answers/${index}/complete`, method: "POST", body: { duration_ms: durationMs } }) }),
    nextInterviewQuestion: builder.mutation<InterviewSession, string>({ query: (id) => ({ url: `/candidate/interview/sessions/${id}/next-question`, method: "POST" }), invalidatesTags: ["Student"] }),
    completeInterview: builder.mutation<InterviewSession, string>({ query: (id) => ({ url: `/candidate/interview/sessions/${id}/complete`, method: "POST" }), invalidatesTags: ["Student"] }),
  }),
});

export const { useGetCourseDetailQuery, useCheckoutCourseMutation, useUpdateLessonProgressMutation, useGetInterviewHistoryQuery, useGetInterviewRecordingsQuery, useGetInterviewReportQuery, useGetApplicationMessagesQuery, useCheckoutInterviewMutation, useCheckInterviewDeviceMutation, useStartInterviewMutation, useGetInterviewSessionQuery, useGetInterviewUploadMutation, useCompleteInterviewAnswerMutation, useNextInterviewQuestionMutation, useCompleteInterviewMutation } = learningApi;
