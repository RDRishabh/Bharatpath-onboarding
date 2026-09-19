"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { DetailSkeleton } from "@/components/common/loading";
import { showAdminFeedback } from "@/store/admin";
import { useAppDispatch } from "@/store/hooks";
import {
  useAllocateAdminCollegeSeatsMutation,
  useGetAdminCollegeQuery,
  useGetAdminEmployerQuery,
  useReinstateAdminTenantMutation,
  useSuspendAdminTenantMutation,
} from "@/store/api/admin-api";

import { useUsers } from "../hooks/use-users";

export function UserDrawer() {
  const dispatch = useAppDispatch();
  const { segment, selectedId, closeUser } = useUsers();
  const [reason, setReason] = useState("");
  const [seats, setSeats] = useState(0);
  const isEmployer = segment === "employers";
  const employerQuery = useGetAdminEmployerQuery(selectedId ?? "", {
    skip: !selectedId || !isEmployer,
  });
  const collegeQuery = useGetAdminCollegeQuery(selectedId ?? "", {
    skip: !selectedId || segment !== "institutions",
  });
  const [suspendTenant, suspendState] = useSuspendAdminTenantMutation();
  const [reinstateTenant, reinstateState] = useReinstateAdminTenantMutation();
  const [allocateSeats, seatState] = useAllocateAdminCollegeSeatsMutation();

  if (!selectedId || segment === "candidates") return null;

  const detail = isEmployer ? employerQuery.data : collegeQuery.data;
  const isLoading = employerQuery.isLoading || collegeQuery.isLoading;
  const error = employerQuery.error || collegeQuery.error || suspendState.error || reinstateState.error || seatState.error;
  const isActing = suspendState.isLoading || reinstateState.isLoading || seatState.isLoading;
  const status = detail?.status;

  const updateStatus = async () => {
    if (status === "SUSPENDED") {
      await reinstateTenant(selectedId).unwrap();
      dispatch(showAdminFeedback("Organisation reinstated."));
    } else if (reason.trim().length >= 3) {
      await suspendTenant({ tenantId: selectedId, reason: reason.trim() }).unwrap();
      dispatch(showAdminFeedback("Organisation suspended."));
      setReason("");
    }
  };

  const saveSeats = async () => {
    await allocateSeats({ tenantId: selectedId, seats }).unwrap();
    dispatch(showAdminFeedback("Seat allocation updated."));
  };

  return (
    <div className="fixed inset-0 z-[100]">
      <button type="button" aria-label="Close details" onClick={closeUser} className="absolute inset-0 bg-[#172033]/30" />
      <aside className="absolute right-0 top-0 flex h-full w-[520px] max-w-full flex-col bg-white shadow-[-20px_0_60px_-24px_rgba(0,0,0,0.5)]" role="dialog" aria-modal="true">
        <header className="flex items-start justify-between border-b border-[#e5e7eb] px-5 py-4">
          <div>
            <h2 className="text-[18px] font-bold text-[#172033]">{detail?.name ?? "Organisation details"}</h2>
            <p className="mt-1 text-[12px] text-[#7b8494]">{isEmployer ? "Employer" : "College"} · {selectedId}</p>
          </div>
          <button type="button" onClick={closeUser} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-[#7b8494] hover:bg-[#f5f6f8]"><X className="h-4 w-4" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {isLoading ? <DetailSkeleton sections={4} /> : null}
          {error ? <p className="mb-4 rounded-lg border border-[#f0c8cc] bg-[#fff7f7] p-3 text-[12px] text-[#9f2432]" role="alert">The organisation details or action could not be completed.</p> : null}
          {detail ? (
            <div className="space-y-5 text-[13px]">
              <section className="grid grid-cols-2 gap-3 rounded-lg border border-[#e5e7eb] p-4">
                <Detail label="Status" value={detail.status} />
                <Detail label="Created" value={new Date(detail.created_at).toLocaleDateString()} />
                <Detail label="Subscription" value={detail.subscription?.state ?? "None"} />
                <Detail label="Plan" value={detail.subscription?.plan_code ?? "None"} />
              </section>

              {isEmployer && employerQuery.data ? (
                <section className="grid grid-cols-2 gap-3 rounded-lg border border-[#e5e7eb] p-4">
                  <Detail label="Legal name" value={employerQuery.data.legal_name ?? "Not provided"} />
                  <Detail label="KYB status" value={employerQuery.data.kyb_status ?? "Not submitted"} />
                  <Detail label="Industry" value={employerQuery.data.industry ?? "Not provided"} />
                  <Detail label="Views, last 30 days" value={String(employerQuery.data.candidates_viewed_last_30_days)} />
                </section>
              ) : null}

              {!isEmployer && collegeQuery.data ? (
                <section className="space-y-3 rounded-lg border border-[#e5e7eb] p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Detail label="Connected students" value={String(collegeQuery.data.connected_students)} />
                    <Detail label="Seats used" value={String(collegeQuery.data.seats?.used ?? 0)} />
                  </div>
                  <label className="block text-[12px] font-semibold text-[#172033]">Allocated seats
                    <input type="number" min={0} value={seats} onChange={(event) => setSeats(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-[#e5e7eb] px-3 py-2" />
                  </label>
                  <button type="button" disabled={isActing} onClick={() => void saveSeats()} className="rounded-lg bg-[#315c9f] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50">{seatState.isLoading ? "Saving..." : "Update seats"}</button>
                </section>
              ) : null}

              {status !== "SUSPENDED" ? (
                <label className="block text-[12px] font-semibold text-[#172033]">Suspension reason
                  <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-[#e5e7eb] px-3 py-2 font-normal" placeholder="Required, at least 3 characters" />
                </label>
              ) : null}
            </div>
          ) : null}
        </div>

        {detail ? (
          <footer className="border-t border-[#e5e7eb] p-4">
            <button type="button" disabled={isActing || (status !== "SUSPENDED" && reason.trim().length < 3)} onClick={() => void updateStatus()} className="w-full rounded-lg border border-[#c92f3f] px-4 py-3 text-[13px] font-semibold text-[#c92f3f] disabled:cursor-not-allowed disabled:opacity-50">
              {isActing ? "Saving..." : status === "SUSPENDED" ? "Reinstate organisation" : "Suspend organisation"}
            </button>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] uppercase text-[#7b8494]">{label}</p><p className="mt-1 font-semibold text-[#172033]">{value}</p></div>;
}
