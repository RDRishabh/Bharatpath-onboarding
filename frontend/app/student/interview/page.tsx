"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGetInterviewOfferQuery } from "@/store/student";
import { useGetInterviewHistoryQuery, useGetInterviewRecordingsQuery, useGetInterviewReportQuery, useCheckoutInterviewMutation, useCheckInterviewDeviceMutation, useStartInterviewMutation } from "@/store/student/learning.api";
import { StudentPage, StudentTopBar } from "@/features/student/shell";

export default function StudentInterviewPage() {
  const router = useRouter();
  const offer = useGetInterviewOfferQuery();
  const history = useGetInterviewHistoryQuery();
  const [selected, setSelected] = useState<string | null>(null);
  const recordings = useGetInterviewRecordingsQuery(selected ?? "", { skip: !selected });
  const report = useGetInterviewReportQuery(selected ?? "", { skip: !selected });
  const [check, checking] = useCheckInterviewDeviceMutation();
  const [checkout, buying] = useCheckoutInterviewMutation();
  const [start, starting] = useStartInterviewMutation();
  const [audioConfirmed, setAudioConfirmed] = useState(false);
  const [quietConfirmed, setQuietConfirmed] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  async function deviceCheck() {
    setError(""); let mic = false;
    try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); mic = stream.getAudioTracks().some((track) => track.readyState === "live"); stream.getTracks().forEach((track) => track.stop()); }
    catch { setError("Allow microphone access to take the interview."); }
    try { const result = await check({ mic_ok: mic, audio_out_ok: audioConfirmed, quiet_env_ok: quietConfirmed }).unwrap(); if (!result.passed) setError(`Device check failed: ${result.failures.join(", ")}`); else await offer.refetch(); }
    catch { setError("Device check could not be saved."); }
  }
  async function buy() { setError(""); try { const payment = await checkout({ acknowledge_no_score_increase: acknowledged }).unwrap(); if (payment.redirect_url) window.location.assign(payment.redirect_url); else setError("Payment is pending. Refresh after it completes."); } catch { setError("Payment checkout is unavailable. Please try again."); } }
  async function begin() { setError(""); try { const session = await start().unwrap(); router.push(`/student/interview/${session.id}`); } catch { setError("Interview could not start. Please try again."); } }
  return <StudentPage><StudentTopBar title="Mock interview" /><div className="mt-5 space-y-5">
    <div className="rounded-xl border bg-white p-5"><h2 className="font-bold">Your next interview</h2><p>{offer.data?.sessionsAvailable ?? 0} paid sessions available</p>
      {offer.data?.openSessionId ? <Link href={`/student/interview/${offer.data.openSessionId}`} className="mt-3 inline-block rounded bg-purple-700 px-4 py-2 text-white">Resume interview</Link> : offer.data?.sessionsAvailable ? <button onClick={begin} disabled={starting.isLoading} className="mt-3 rounded bg-purple-700 px-4 py-2 text-white">Start interview</button> : <>
        <p className="mt-2">Price: {offer.data?.priceMinor != null ? new Intl.NumberFormat("en-IN", { style: "currency", currency: offer.data.currency }).format(offer.data.priceMinor / 100) : "Unavailable"}</p>
        <div className="mt-3 space-y-2"><label className="block"><input type="checkbox" checked={audioConfirmed} onChange={(e) => setAudioConfirmed(e.target.checked)} /> I can hear audio from this device</label><label className="block"><input type="checkbox" checked={quietConfirmed} onChange={(e) => setQuietConfirmed(e.target.checked)} /> I am in a quiet place</label></div>
        <button onClick={deviceCheck} disabled={checking.isLoading || !audioConfirmed || !quietConfirmed} className="mt-3 rounded border px-4 py-2">Check microphone and device</button>
        {offer.data?.deviceCheckPassed && <p className="mt-2 text-green-700">Device check passed.</p>}
        {offer.data?.requiresAcknowledgement && <label className="mt-3 block"><input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} /> I understand this interview will not increase my score.</label>}
        <button onClick={buy} disabled={buying.isLoading || !offer.data?.onSale || !offer.data?.deviceCheckPassed || (offer.data?.requiresAcknowledgement && !acknowledged)} className="mt-3 block rounded bg-purple-700 px-4 py-2 text-white disabled:opacity-50">Pay for interview</button>
      </>}{error && <p role="alert" className="mt-2 text-red-700">{error}</p>}</div>
    <div className="rounded-xl border bg-white p-5"><h2 className="mb-3 font-bold">Interview history</h2>
      {history.data?.map((s) => <button key={s.id} onClick={() => setSelected(s.id)} className="mb-2 block w-full rounded border p-3 text-left"><b>Session {s.session_number}</b> · {s.question_set_title} · {s.state} · {s.answers_stored}/{s.questions_asked} answers</button>)}
      {!history.isLoading && !history.data?.length && <p>No interviews yet.</p>}
      {selected && <div className="mt-4 space-y-3"><h3 className="font-semibold">Recordings</h3>{recordings.data?.map((r) => <div key={r.question_index}><p>{r.prompt}</p><audio controls src={r.url} className="w-full" /><p className="text-sm">{r.transcript}</p></div>)}{recordings.error && <p>Recordings unavailable.</p>}
        <h3 className="font-semibold">Feedback · {report.data?.status ?? "Loading"}</h3>{report.data?.dimensions.map((d) => <p key={d.code}><b>{d.label}: {d.level}</b> · {d.what_good_looks_like}</p>)}
      </div>}
    </div></div></StudentPage>;
}
