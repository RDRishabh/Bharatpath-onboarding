"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGetInterviewSessionQuery, useGetInterviewUploadMutation, useCompleteInterviewAnswerMutation, useNextInterviewQuestionMutation, useCompleteInterviewMutation } from "@/store/student/learning.api";
import { StudentPage } from "@/features/student/shell";
import { StudentErrorState } from "@/features/student/components";

export default function InterviewSessionPage() {
  const id = useParams<{ sessionId: string }>().sessionId;
  const session = useGetInterviewSessionQuery(id);
  const [upload] = useGetInterviewUploadMutation();
  const [completeAnswer] = useCompleteInterviewAnswerMutation();
  const [nextQuestion, nextState] = useNextInterviewQuestionMutation();
  const [complete, completeState] = useCompleteInterviewMutation();
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(0);
  const [clip, setClip] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = session.data?.questions.find((q) => session.data?.answers.find((a) => a.question_index === q.index)?.upload_state !== "STORED");
  const clipUrl = useMemo(() => clip ? URL.createObjectURL(clip) : null, [clip]);
  useEffect(() => () => { if (clipUrl) URL.revokeObjectURL(clipUrl); }, [clipUrl]);
  useEffect(() => () => { if (stopTimer.current) clearTimeout(stopTimer.current); if (recorder.current?.state === "recording") recorder.current.stop(); stream.current?.getTracks().forEach((track) => track.stop()); }, []);
  async function record() {
    setError(""); setClip(null);
    try { const media = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.current = media;
      const mime = ["audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const chunks: BlobPart[] = []; const next = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      next.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      next.onstop = () => { if (stopTimer.current) clearTimeout(stopTimer.current); setClip(new Blob(chunks, { type: next.mimeType.split(";")[0] })); setDuration(Date.now() - started.current); media.getTracks().forEach((track) => track.stop()); setRecording(false); };
      recorder.current = next; started.current = Date.now(); next.start(); setRecording(true);
      stopTimer.current = setTimeout(() => { if (next.state === "recording") next.stop(); }, (current?.answer_seconds ?? 120) * 1000);
    } catch { setError("Microphone permission is required to record your answer."); }
  }
  function stop() { recorder.current?.stop(); }
  async function send() {
    if (!clip || !current) return; setBusy(true); setError("");
    try {
      const signed = await upload({ id, index: current.index }).unwrap();
      if (clip.size > signed.max_bytes || duration > signed.max_duration_ms || !signed.accepted_types.includes(clip.type)) throw new Error("Recording format, size or length is not accepted. Please record again.");
      const response = await fetch(signed.url, { method: "PUT", headers: { "Content-Type": clip.type }, body: clip });
      if (!response.ok) throw new Error("Recording upload failed. Please retry.");
      await completeAnswer({ id, index: current.index, durationMs: duration }).unwrap();
      setClip(null);
      if (current.index + 1 < (session.data?.questions_total ?? 0)) await nextQuestion(id).unwrap();
      await session.refetch();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the answer. Please retry."); }
    finally { setBusy(false); }
  }
  async function finish() { setError(""); try { await complete(id).unwrap(); await session.refetch(); } catch { setError("Could not finish the interview. Please retry."); } }
  return <StudentPage><div className="rounded-xl border bg-white p-5">
    {session.isLoading && <p>Loading your interview…</p>}{session.error && <StudentErrorState title="Interview unavailable" error={session.error} fallback="We could not load this interview." onRetry={() => void session.refetch()} />}
    {session.data && <><p className="text-sm">{session.data.questions.filter((q) => session.data?.answers.find((a) => a.question_index === q.index)?.upload_state === "STORED").length} of {session.data.questions_total} answers saved</p>
      {current ? <><h2 className="mt-4 text-xl font-bold">Question {current.index + 1}</h2><p className="mt-2">{current.prompt}</p>
        <p className="mt-2 text-sm">You have {current.preparation_seconds} seconds to prepare and up to {current.answer_seconds} seconds to answer.</p>
        {recording ? <button onClick={stop} className="mt-4 rounded bg-red-700 px-4 py-2 text-white">Stop recording</button> : <button onClick={record} disabled={busy} className="mt-4 rounded bg-purple-700 px-4 py-2 text-white">Record answer</button>}
        {clip && <div className="mt-4">{clipUrl && <audio controls src={clipUrl} />}<button onClick={send} disabled={busy} className="mt-2 block rounded bg-purple-700 px-4 py-2 text-white">Save answer and continue</button></div>}
      </> : session.data.state === "COMPLETED" || session.data.state === "EVALUATED" ? <p className="mt-3">Interview completed.</p> : session.data.answers.every((a) => a.upload_state === "STORED") ? <><p className="mt-3">All answers saved.</p><button onClick={finish} disabled={completeState.isLoading} className="mt-3 rounded bg-purple-700 px-4 py-2 text-white">Finish interview</button></> : <div className="mt-3"><p>{nextState.isLoading ? "Interviewer is thinking…" : "Your next question is ready to request."}</p><button onClick={async () => { try { await nextQuestion(id).unwrap(); await session.refetch(); } catch { setError("Could not prepare the next question. Please retry."); } }} disabled={nextState.isLoading} className="mt-2 rounded border px-4 py-2">Get next question</button></div>}
      {session.data.state === "COMPLETED" || session.data.state === "EVALUATED" ? <Link href="/student/interview" className="mt-4 block text-blue-700">View interview history</Link> : null}
    </>}{error && <StudentErrorState variant="inline" className="mt-3" message={error} />}
  </div></StudentPage>;
}
