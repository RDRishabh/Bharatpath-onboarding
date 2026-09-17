"use client";

import { useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import {
  closeInviteModal,
  inviteMember,
  type TeamRole,
} from "@/store/employer/settings";

const inputClass =
  "min-h-[43px] w-full rounded-[9px] border border-[#dfe4ea] bg-white px-3.5 text-[13px] text-[#111827] outline-none transition focus:border-[#526cc8] focus:ring-4 focus:ring-[#526cc8]/10";

export function InviteMemberModal() {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("Recruiter");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    dispatch(inviteMember({ email, role }));
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/35 p-5">
      <form
        className="w-full max-w-[440px] rounded-[13px] border border-[#dfe4ea] bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.18)]"
        onSubmit={submit}
      >
        <div className="mb-[18px] flex items-start justify-between gap-3">
          <div>
            <h3 className="m-0 text-[15px] font-bold">
              Invite team member
            </h3>
            <p className="mt-0.5 text-xs leading-4 text-[#718096]">
              Give another person access to this employer account.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close"
            className="grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-[7px] border border-[#dfe4ea] bg-white text-lg"
            onClick={() => dispatch(closeInviteModal())}
          >
            ×
          </button>
        </div>

        <label className="mb-3 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold leading-[15px] text-[#526074]">
            Work email
          </span>
          <input
            autoFocus
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="mb-3 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold leading-[15px] text-[#526074]">
            Role
          </span>
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value as TeamRole)
            }
            className={inputClass}
          >
            <option value="Recruiter">Recruiter</option>
            <option value="View only">View only</option>
          </select>
        </label>

        <div className="mt-[18px] flex justify-end gap-2">
          <button
            type="button"
            className="min-h-9 cursor-pointer rounded-lg border border-[#d6dbe2] bg-white px-3.5 text-xs font-bold text-[#172033]"
            onClick={() => dispatch(closeInviteModal())}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="min-h-9 cursor-pointer rounded-lg border border-[#5a4bd1] bg-[#5b4ed0] px-3.5 text-xs font-bold text-white hover:bg-[#4f43bd]"
          >
            Send invite
          </button>
        </div>
      </form>
    </div>
  );
}
