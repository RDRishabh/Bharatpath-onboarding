"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useGetCourseDetailQuery, useCheckoutCourseMutation, useUpdateLessonProgressMutation } from "@/store/student/learning.api";
import { StudentPage, StudentTopBar } from "@/features/student/shell";

export default function CoursePage() {
  const id = useParams<{ courseId: string }>().courseId;
  const course = useGetCourseDetailQuery(id);
  const [checkout, payment] = useCheckoutCourseMutation();
  const [progress] = useUpdateLessonProgressMutation();
  const [error, setError] = useState("");
  async function buy() { try { const result = await checkout(id).unwrap(); if (result.redirect_url) window.location.assign(result.redirect_url); else setError("Payment is pending. Refresh after it completes."); } catch { setError("Checkout is unavailable. Please try again."); } }
  return <StudentPage><StudentTopBar title={course.data?.title ?? "Course"} />
    {course.data?.locked ? <div className="mt-5 rounded-xl border bg-white p-5"><p>Course lessons unlock after payment is confirmed.</p><button onClick={buy} disabled={payment.isLoading} className="mt-3 rounded bg-purple-700 px-4 py-2 text-white">Pay to unlock</button></div> : null}
    {error && <p role="alert">{error}</p>}
    {course.data?.modules.map((module) => <section key={module.id} className="mt-5 rounded-xl border bg-white p-5"><h2 className="font-bold">{module.title}</h2>{module.lessons.map((lesson) => <div key={lesson.id} className="border-t py-4"><h3 className="font-medium">{lesson.title} {lesson.completed ? "✓" : ""}</h3><p>{lesson.description}</p>{!course.data?.locked && lesson.media_url && (lesson.media_kind === "YOUTUBE" ? <iframe title={lesson.title} src={lesson.media_url} className="mt-2 aspect-video w-full" allowFullScreen /> : <video controls src={lesson.media_url} className="mt-2 w-full" onPause={(event) => void progress({ courseId: id, lessonId: lesson.id, positionSeconds: Math.floor(event.currentTarget.currentTime) })} onEnded={() => void progress({ courseId: id, lessonId: lesson.id, positionSeconds: lesson.duration_seconds })} />)}</div>)}</section>)}
    {course.error && <p>Course unavailable.</p>}
  </StudentPage>;
}
