"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  askRemoveMember,
  openInviteModal,
  resendInvite,
  selectTeamMembers,
  toggleMemberMenu,
} from "@/store/employer/settings";
import { UserPlus } from "lucide-react";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TeamTab() {
  const dispatch = useAppDispatch();
  const members = useAppSelector(selectTeamMembers);

  return (
    <>
      <div className="mb-2.5 flex items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-[14px] font-semibold leading-[18px]">
            Team members · {members.length}
          </h2>
          <p className="mt-0.5 text-xs leading-4 text-[#718096]">
            People with access to this employer account
          </p>
        </div>

        <button
          type="button"
          className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-[#5a4bd1] bg-[#5b4ed0] px-3.5 text-xs font-bold text-white hover:bg-[#4f43bd]"
          onClick={() => dispatch(openInviteModal())}
        >
          <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
          Invite member
        </button>
      </div>

      <section className="overflow-visible rounded-xl border border-[#e0e4e9] bg-white shadow-[0_1px_2px_rgba(17,24,39,0.02)]">
        <div className="grid min-h-[37px] grid-cols-[minmax(0,1fr)_105px_95px_28px] items-center gap-[18px] bg-[#f4f6f8] px-[18px] text-[10px] font-extrabold text-[#657083] max-sm:grid-cols-[minmax(0,1fr)_90px_70px_22px] max-sm:gap-2 max-sm:px-2.5">
          <span>MEMBER</span>
          <span>ROLE</span>
          <span>STATUS</span>
          <span />
        </div>

        {members.map((member) => (
          <div
            key={member.id}
            className="grid min-h-[57px] grid-cols-[minmax(0,1fr)_105px_95px_28px] items-center gap-[18px] border-t border-[#edf0f3] px-[18px] max-sm:grid-cols-[minmax(0,1fr)_90px_70px_22px] max-sm:gap-2 max-sm:px-2.5"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-[#f2f4f6] text-[10px] font-bold text-[#526074]">
                {initials(member.name)}
              </div>

              <div className="min-w-0">
                <strong className="block truncate text-xs">
                  {member.name}
                </strong>

                {member.email && (
                  <small className="mt-0.5 block truncate text-[10px] text-[#718096]">
                    {member.email}
                  </small>
                )}
              </div>
            </div>

            <span
              className={[
                "w-fit rounded-full px-2 py-1 text-[10px] font-bold",
                member.role === "Owner"
                  ? "bg-[#edf1fb] text-[#34518e]"
                  : "bg-[#f2f4f6] text-[#5b6575]",
              ].join(" ")}
            >
              {member.role}
            </span>

            <span
              className={[
                "text-[11px]",
                member.status === "Active"
                  ? "text-[#13875e]"
                  : "text-[#5266a4]",
              ].join(" ")}
            >
              {member.status}
            </span>

            {member.canRemove ? (
              <div className="relative">
                <button
                  type="button"
                  aria-label={`Actions for ${member.name}`}
                  className="cursor-pointer border-0 bg-transparent text-[17px] text-[#4e5a6c]"
                  onClick={() => dispatch(toggleMemberMenu(member.id))}
                >
                  ⋮
                </button>

                <MemberMenu
                  memberId={member.id}
                  status={member.status}
                />
              </div>
            ) : (
              <span />
            )}
          </div>
        ))}
      </section>
    </>
  );
}

function MemberMenu({
  memberId,
  status,
}: {
  memberId: string;
  status: "Active" | "Invited";
}) {
  const dispatch = useAppDispatch();
  const openId = useAppSelector(
    (state) => state.employerSettings.memberMenuOpenId,
  );

  if (openId !== memberId) return null;

  return (
    <div className="absolute right-0 top-7 z-10 w-[145px] rounded-lg border border-[#dfe4ea] bg-white p-1 shadow-[0_10px_28px_rgba(17,24,39,0.12)]">
      {status === "Invited" && (
        <button
          type="button"
          className="block w-full cursor-pointer rounded-md border-0 bg-transparent px-2.5 py-2 text-left text-[11px] hover:bg-[#f4f6f8]"
          onClick={() => dispatch(resendInvite(memberId))}
        >
          Resend invite
        </button>
      )}

      <button
        type="button"
        className="block w-full cursor-pointer rounded-md border-0 bg-transparent px-2.5 py-2 text-left text-[11px] text-[#c0392b] hover:bg-[#f4f6f8]"
        onClick={() => dispatch(askRemoveMember(memberId))}
      >
        Remove member
      </button>
    </div>
  );
}
