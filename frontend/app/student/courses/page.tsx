"use client";

import Link from "next/link";
import { BookOpen, ChevronRight, CircleCheck, LockKeyhole } from "lucide-react";

import { useGetStudentCoursesQuery } from "@/store/student";
import { EmptyState, MeterBar, StudentErrorState, StatusChip, interactiveCardClass } from "@/features/student/components";
import { CourseListSkeleton } from "@/features/student/courses/course-skeletons";
import { StudentPage } from "@/features/student/shell";

function priceLabel(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export default function CoursesPage() {
  const courses = useGetStudentCoursesQuery();

  if (courses.isLoading) return <CourseListSkeleton />;

  return <StudentPage>
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#0A1931] sm:text-[28px]">Learn at your pace</h1>
        <p className="mt-1 text-[14px] leading-5 text-[#5F6B80]">Explore courses, track lessons, and continue where you left off.</p>
      </div>

      {courses.error ? <StudentErrorState icon={<BookOpen size={22} />} title="Courses unavailable" error={courses.error} fallback="Could not load courses right now." />
        : courses.data?.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{courses.data.map((course) => <Link
          key={course.id}
          href={`/student/courses/${course.id}`}
          className={`flex min-h-52 flex-col rounded-[20px] border border-[#E7E0D4] bg-white p-4 text-[#0A1931] ${interactiveCardClass}`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[#F1EAF7] text-[#5F4DB2]"><BookOpen size={20} /></span>
            <StatusChip tone={course.completed ? "paid" : course.locked ? "waiting" : "advanced"} icon={course.completed ? <CircleCheck size={12} /> : course.locked ? <LockKeyhole size={12} /> : undefined}>
              {course.completed ? "Completed" : course.locked ? "Locked" : "In progress"}
            </StatusChip>
          </div>
          <h2 className="mt-4 text-[17px] font-bold leading-6 tracking-[-0.02em] text-[#0A1931]">{course.title}</h2>
          {course.purchased ? <div className="mt-3"><div className="mb-2 flex items-center justify-between text-[12px] text-[#5F6B80]"><span>{course.lessonsCompleted} of {course.lessonsTotal} lessons</span><span className="font-semibold text-[#5F4DB2]">{course.percentComplete}%</span></div><MeterBar value={course.percentComplete} /></div> : <p className="mt-2 text-[13px] text-[#5F6B80]">Unlock lessons for {priceLabel(course.priceMinor, course.currency)}.</p>}
          <div className="mt-auto flex items-center justify-between border-t border-[#F0EBDF] pt-3 text-[13px] font-semibold text-[#5F4DB2]"><span>{course.purchased ? "View course" : "Explore course"}</span><ChevronRight size={17} /></div>
        </Link>)}</div>
        : <EmptyState icon={<BookOpen size={22} />} title="No courses available" message="Courses will appear here when they are published." />}
    </div>
  </StudentPage>;
}
