"use client";

import { usePageHeader } from "@/components/layout/header-context";

import { useSettings } from "../hooks/use-settings";

import { Billing } from "./billing";
import { CollegeProfile } from "./college-profile";
import { CollegeUsers } from "./college-users";

const tabs = [
  {
    id: "profile" as const,
    label: "College profile",
  },
  {
    id: "users" as const,
    label: "Users",
  },
  {
    id: "billing" as const,
    label: "Seats & payment",
  },
];

export function CollegeSettings() {
  const {
    activeTab,
    changeTab,
    seats,
  } = useSettings();

  usePageHeader(
    "Settings & Billing",
    "College profile, users, seats and payment",
    {
      stat: {
        label: `${seats.used} of ${seats.total} seats used`,
        progress:
          seats.total > 0
            ? (seats.used / seats.total) * 100
            : 0,
      },
    },
  );

  return (
    <div
      className="min-h-full bg-[#f8f9fb]"
      style={{ fontFamily: "'General Sans', sans-serif" }}
    >
      {/* Settings Tabs */}
      <div className="border-b border-[#e1e5eb] bg-[#f8f9fb]">
        <div className="flex h-[49px] items-end">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => changeTab(tab.id)}
                className={[
                  "relative flex h-[49px] items-center px-4",
                  "whitespace-nowrap text-[13px] font-semibold",
                  "transition-colors",
                  active
                    ? "text-[#131A26]"
                    : "text-[#64748b] hover:text-[#131A26]",
                ].join(" ")}
              >
                {tab.label}

                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3566b8]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Content */}
      <main className="min-h-[calc(100vh-125px)] py-5">
        {activeTab === "profile" && (
          <CollegeProfile />
        )}

        {activeTab === "users" && (
          <CollegeUsers />
        )}

        {activeTab === "billing" && (
          <Billing />
        )}
      </main>
    </div>
  );
}