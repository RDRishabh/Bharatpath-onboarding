"use client";

import { useState } from "react";
import { useGetEmployerMessagesQuery, useSendEmployerMessageMutation } from "@/store/employer/applications/applications.api";

export function ApplicationMessages({ applicationId }: { applicationId: string }) {
  const messages = useGetEmployerMessagesQuery(applicationId);
  const [send, sending] = useSendEmployerMessageMutation();
  const [kind, setKind] = useState<"INTERVIEW" | "ASSESSMENT" | "GENERAL">("INTERVIEW");
  const [body, setBody] = useState("");
  const [when, setWhen] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    try { await send({ applicationId, kind, body, scheduled_at: when ? new Date(when).toISOString() : undefined, link: link || undefined }).unwrap(); setBody(""); setWhen(""); setLink(""); }
    catch { setError("Message could not be sent. Check the schedule and link, then try again."); }
  }
  return <section className="border-t pt-5"><h3 className="font-semibold">Messages to candidate</h3>
    <p className="mt-1 text-xs text-slate-500">The platform sends each message by email and notification.</p>
    <div className="mt-3 max-h-36 space-y-2 overflow-y-auto">{messages.data?.map((m) => <div key={m.id} className="rounded border p-2 text-sm"><b>{m.kind}</b> · {new Date(m.created_at).toLocaleString()}<p>{m.body}</p>{m.link && <a href={m.link} target="_blank" rel="noreferrer" className="text-blue-700">Open link</a>}</div>)}</div>
    <form onSubmit={submit} className="mt-3 space-y-2"><select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="w-full rounded border p-2"><option value="INTERVIEW">Interview invitation</option><option value="ASSESSMENT">Online assessment</option><option value="GENERAL">General message</option></select>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} minLength={1} maxLength={2000} required placeholder="Write your message" className="w-full rounded border p-2" />
      {kind !== "GENERAL" && <><label className="block text-sm">{kind === "INTERVIEW" ? "Interview time" : "Assessment deadline (optional)"}<input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required={kind === "INTERVIEW"} className="mt-1 w-full rounded border p-2" /></label><input type="url" value={link} onChange={(e) => setLink(e.target.value)} required={kind === "ASSESSMENT"} pattern="https://.*" placeholder="https:// meeting or assessment link" className="w-full rounded border p-2" /></>}
      <button disabled={sending.isLoading} className="rounded bg-blue-700 px-4 py-2 text-sm text-white">Send message</button>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</form>
  </section>;
}
