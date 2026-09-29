"use client";

import { useState } from "react";
import { useGetPrivacyRequestsQuery, useRequestPrivacyExportMutation, useRequestPrivacyDeletionMutation, useWithdrawPrivacyRequestMutation, useGetPrivacyDownloadMutation } from "@/store/api/privacy-api";

export function DataRights() {
  const requests = useGetPrivacyRequestsQuery();
  const [exportData, exporting] = useRequestPrivacyExportMutation();
  const [deleteData, deleting] = useRequestPrivacyDeletionMutation();
  const [withdraw] = useWithdrawPrivacyRequestMutation();
  const [download] = useGetPrivacyDownloadMutation();
  const [error, setError] = useState("");
  async function run(action: () => Promise<unknown>) { setError(""); try { await action(); } catch { setError("Request could not be completed. Please try again."); } }
  return <section className="mt-5 rounded-xl border bg-white p-5"><h2 className="text-lg font-bold">Your data</h2><p className="mt-1 text-sm">Request a copy of your data or ask to delete your account.</p>
    <div className="mt-3 flex gap-2"><button disabled={exporting.isLoading} onClick={() => void run(() => exportData().unwrap())} className="rounded border px-3 py-2">Request export</button><button disabled={deleting.isLoading} onClick={() => { if (window.confirm("Request deletion of your account and personal data? You can withdraw before the listed erasure time.")) void run(() => deleteData().unwrap()); }} className="rounded border border-red-700 px-3 py-2 text-red-700">Request deletion</button></div>
    {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
    <div className="mt-4 space-y-2">{requests.data?.items.map((r) => <div key={r.id} className="rounded border p-3 text-sm"><b>{r.type}</b> · {r.state} · requested {new Date(r.created_at).toLocaleDateString()}{r.erasable_at && <p>Earliest erasure: {new Date(r.erasable_at).toLocaleString()}</p>}
      {r.download_available && <button onClick={() => void run(async () => { const result = await download(r.id).unwrap(); window.open(result.url, "_blank", "noopener,noreferrer"); })} className="mr-3 text-blue-700 underline">Download export</button>}
      {r.type === "DELETE" && ["RECEIVED", "IN_PROGRESS"].includes(r.state) && <button onClick={() => void run(() => withdraw(r.id).unwrap())} className="text-blue-700 underline">Withdraw deletion request</button>}
    </div>)}{requests.error && <p>Requests could not be loaded.</p>}</div>
  </section>;
}
