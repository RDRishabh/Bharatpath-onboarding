"use client";

import { Search } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectAdminUsers,
  setUserSearch,
  setUserSegment,
} from "@/store/admin";

import { usePageHeader } from "@/components/layout/header-context";
import {
  DataTable,
  type ColumnDef,
} from "@/components/ui/table";

import { users } from "../shared/data";
import { StateBadge } from "../shared/status-badge";

type UserRow = (typeof users)[keyof typeof users][number];

export function AdminUsersPage() {
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectAdminUsers);

  usePageHeader(
    "Users",
    "Candidates, employers and institutions on the platform",
  );

  const rows = users[state.segment].filter((user) =>
    `${user.name}${user.identifier}${user.meta}`
      .toLowerCase()
      .includes(state.search.toLowerCase()),
  );

  const columns: ColumnDef<UserRow>[] = [
    {
      id: "subject",
      header: "Employer",
      headerClassName: "min-w-[320px]",
      cellClassName: "min-w-[320px]",
      cell: (user) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f0f2f5] text-[10px] font-bold text-[#172033]">
            {user.initials}
          </span>

          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-5 text-[#172033]">
              {user.name}
            </p>

            <p className="truncate text-[11px] leading-4 text-[#7b8494]">
              {user.meta}
            </p>
          </div>
        </div>
      ),
    },

    {
      id: "identifier",
      header: "Identifier",
      headerClassName: "min-w-[185px]",
      cellClassName:
        "min-w-[185px] whitespace-nowrap text-[12px] text-[#344054]",
      cell: (user) => user.identifier,
    },

    {
      id: "state",
      header: "State",
      headerClassName: "min-w-[135px]",
      cellClassName: "min-w-[135px]",
      cell: (user) => <StateBadge state={user.state} />,
    },

    {
      id: "joined",
      header: "Joined",
      headerClassName: "min-w-[135px]",
      cellClassName:
        "min-w-[135px] whitespace-nowrap text-[12px] text-[#7b8494]",
      cell: (user) => user.joined,
    },

    {
      id: "actions",
      header: "Actions",
      headerClassName: "min-w-[100px]",
      cellClassName: "min-w-[100px]",
      cell: () => (
        <button
          type="button"
          className="cursor-pointer rounded-lg border border-[#e2e5eb] bg-white px-3 py-2 text-[11px] font-semibold text-[#172033] transition-colors hover:bg-[#f8f9fb]"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="min-w-0 space-y-0">
        {/* =================================================
            SEGMENT TABS
            ================================================= */}
        <div className="border-b border-[#e7e9ee]">
          <div className="flex items-center gap-1">
            {(
              [
                ["candidates", "Candidates"],
                ["employers", "Employers"],
                ["institutions", "Institutions"],
              ] as const
            ).map(([segment, label]) => {
              const active = state.segment === segment;

              return (
                <button
                  key={segment}
                  type="button"
                  onClick={() => dispatch(setUserSegment(segment))}
                  className={[
                    "relative shrink-0 cursor-pointer px-4 py-3",
                    "text-[13px] font-semibold transition-colors",
                    active
                      ? "text-[#172033]"
                      : "text-[#687182] hover:text-[#172033]",
                  ].join(" ")}
                >
                  {label}

                  {active && (
                    <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#315c9f]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* =================================================
            SEARCH
            ================================================= */}
        <div className="py-4">
          <label className="flex h-[38px] w-[246px] items-center gap-2 rounded-lg border border-[#e2e5eb] bg-white px-3 transition-colors focus-within:border-[#315c9f]">
            <Search className="h-4 w-4 shrink-0 text-[#667085]" />

            <input
              type="text"
              value={state.search}
              onChange={(event) =>
                dispatch(setUserSearch(event.target.value))
              }
              placeholder="Name, ID or GSTIN"
              className="w-full bg-transparent text-[12px] text-[#172033] outline-none placeholder:text-[#7b8494]"
            />
          </label>
        </div>

        {/* =================================================
            USERS TABLE
            ================================================= */}
        <DataTable<UserRow>
          columns={columns}
          data={rows}
          keyExtractor={(user) => user.name}
          totalCount={rows.length}
          pageSize={5}
          itemLabel=""
          emptyTitle="No users found"
          emptySubtitle=""
        />
      </div>
    </>
  );
}

export const UsersPage = AdminUsersPage;