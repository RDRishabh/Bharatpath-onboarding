"use client";

import Link from "next/link";
import { useGetStudentCoursesQuery } from "@/store/student";
import { StudentPage, StudentTopBar } from "@/features/student/shell";

export default function CoursesPage() {
  const courses = useGetStudentCoursesQuery();
  return <StudentPage><StudentTopBar title="Courses" />
    <div className="mt-5 grid gap-4">{courses.data?.map((course) => <Link key={course.id} href={`/student/courses/${course.id}`} className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-bold">{course.title}</h2><p>{course.purchased ? course.completed ? "Completed" : "Continue learning" : "Locked · payment required"}</p>
    </Link>)}{courses.error && <p>Courses could not be loaded.</p>}{!courses.isLoading && !courses.data?.length && <p>No courses available.</p>}</div>
  </StudentPage>;
}
