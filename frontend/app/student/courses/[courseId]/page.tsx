"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { BookOpen, Check, ChevronRight, CircleCheck, LockKeyhole, Play, Video } from "lucide-react";

import {
  useGetCourseDetailQuery,
  useCheckoutCourseMutation,
  useUpdateLessonProgressMutation,
} from "@/store/student/learning.api";
import {
  EmptyState,
  MeterBar,
  NoteStrip,
  PillButton,
  SectionEyebrow,
  StatusChip,
  StudentCard,
  StudentErrorState,
} from "@/features/student/components";
import { CourseDetailSkeleton } from "@/features/student/courses/course-skeletons";
import { StudentPage, StudentTopBar } from "@/features/student/shell";

function durationLabel(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes > 0 ? `${minutes} min` : "Short lesson";
}

export default function CoursePage() {
  const id = useParams<{ courseId: string }>().courseId;
  const course = useGetCourseDetailQuery(id);
  const [checkout, payment] = useCheckoutCourseMutation();
  const [saveProgress] = useUpdateLessonProgressMutation();
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (course.isLoading) return <CourseDetailSkeleton />;
  if (course.error || !course.data) return <StudentPage><StudentTopBar title="Back to courses" backHref="/student/courses" /><StudentErrorState icon={<BookOpen size={22} />} title="Course unavailable" error={course.error} fallback="Could not load this course." /></StudentPage>;

  const data = course.data;
  const activeLesson = data.modules.flatMap((module) => module.lessons).find((lesson) => lesson.id === activeLessonId);
  const price = new Intl.NumberFormat("en-IN", { style: "currency", currency: data.currency, maximumFractionDigits: 0 }).format(data.price_minor / 100);

  async function buy() {
    setError("");
    try {
      const result = await checkout(id).unwrap();
      if (result.redirect_url) window.location.assign(result.redirect_url);
      else setError("Payment is pending. Refresh this page after it completes.");
    } catch {
      setError("Checkout is unavailable. Please try again.");
    }
  }

  function progress(lessonId: string, positionSeconds: number) {
    void saveProgress({ courseId: id, lessonId, positionSeconds });
  }

  return <StudentPage>
    <StudentTopBar title="Back to courses" backHref="/student/courses" />
    <div className="flex flex-col gap-5">
      <StudentCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px] bg-[#F1EAF7] text-[#5F4DB2]"><BookOpen size={23} /></span>
            <div className="min-w-0"><h1 className="text-[23px] font-bold leading-7 tracking-[-0.03em] text-[#0A1931] sm:text-[27px]">{data.title}</h1><p className="mt-1 text-[13px] text-[#5F6B80]">{data.modules.length} modules · {data.lessons_total} lessons</p></div>
          </div>
          <StatusChip tone={data.completed ? "paid" : data.locked ? "waiting" : "advanced"} icon={data.completed ? <CircleCheck size={12} /> : data.locked ? <LockKeyhole size={12} /> : undefined}>{data.completed ? "Completed" : data.locked ? "Locked" : "In progress"}</StatusChip>
        </div>

        {data.locked ? <div className="mt-5 border-t border-[#F0EBDF] pt-5"><p className="text-[14px] leading-5 text-[#3A4761]">Unlock this course to watch its lessons and save your progress.</p><div className="mt-4 flex flex-wrap items-center gap-4"><PillButton onClick={() => void buy()} disabled={payment.isLoading}>{payment.isLoading ? "Preparing payment…" : `Unlock for ${price}`}</PillButton><span className="text-[12px] text-[#5F6B80]">Access begins after payment is confirmed.</span></div></div>
          : <div className="mt-5 border-t border-[#F0EBDF] pt-5"><div className="mb-2 flex items-center justify-between text-[12px]"><span className="font-semibold text-[#3A4761]">Your progress · {data.lessons_completed} of {data.lessons_total} lessons</span><span className="font-bold text-[#5F4DB2]">{data.percent_complete}%</span></div><MeterBar value={data.percent_complete} height={7} /></div>}
      </StudentCard>

      {error && <NoteStrip tone="amber">{error}</NoteStrip>}

      <div className="flex flex-col gap-3"><SectionEyebrow icon={<BookOpen size={14} />}>Course content</SectionEyebrow>
        {data.modules.length ? data.modules.map((module, moduleIndex) => <StudentCard key={module.id} padded={false} className="overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F1EAF7] text-[12px] font-bold text-[#5F4DB2]">{moduleIndex + 1}</span><div className="min-w-0 flex-1"><h2 className="text-[16px] font-bold text-[#0A1931]">{module.title}</h2><p className="text-[12px] text-[#5F6B80]">{module.lessons.length} lessons</p></div></div>
          <div className="border-t border-[#F0EBDF]">{module.lessons.map((lesson, lessonIndex) => <button key={lesson.id} type="button" disabled={data.locked} onClick={() => setActiveLessonId(lesson.id === activeLessonId ? null : lesson.id)} className="flex w-full items-center gap-3 border-b border-[#F0EBDF] px-4 py-3 text-left last:border-b-0 enabled:hover:bg-[#FFFCF7] disabled:cursor-not-allowed">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${lesson.completed ? "bg-[#E6F1EA] text-[#1F6B45]" : "bg-[#F7F4EC] text-[#5F6B80]"}`}>{lesson.completed ? <Check size={15} /> : data.locked ? <LockKeyhole size={14} /> : <Play size={13} />}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-semibold text-[#0A1931]">{lessonIndex + 1}. {lesson.title}</span><span className="block text-[12px] text-[#5F6B80]">{durationLabel(lesson.duration_seconds)}{lesson.completed ? " · Completed" : ""}</span></span>
            {!data.locked && <ChevronRight size={16} className="shrink-0 text-[#5F6B80]" />}
          </button>)}</div>
        </StudentCard>) : <EmptyState icon={<Video size={22} />} title="Lessons coming soon" message="Lessons will appear here when this course is published." />}
      </div>

      {!data.locked && activeLesson && <StudentCard className="p-5"><div className="mb-3 flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F1EAF7] text-[#5F4DB2]"><Play size={16} /></span><div><h2 className="text-[17px] font-bold text-[#0A1931]">{activeLesson.title}</h2>{activeLesson.description && <p className="mt-1 text-[13px] leading-5 text-[#5F6B80]">{activeLesson.description}</p>}</div></div>
        {activeLesson.media_url ? activeLesson.media_kind === "YOUTUBE" ? <iframe title={activeLesson.title} src={activeLesson.media_url} className="aspect-video w-full rounded-xl border border-[#E7E0D4]" allowFullScreen /> : <video controls src={activeLesson.media_url} className="w-full rounded-xl" onPause={(event) => progress(activeLesson.id, Math.floor(event.currentTarget.currentTime))} onEnded={() => progress(activeLesson.id, activeLesson.duration_seconds)} /> : <NoteStrip tone="cream">This lesson&apos;s video is not available right now. Try opening it again later.</NoteStrip>}
      </StudentCard>}
    </div>
  </StudentPage>;
}
