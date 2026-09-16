"use client";

import React from "react";
import { Hourglass, Link as LinkIcon, Send } from "lucide-react";

export interface LinkStatesSummaryProps {
  linkedCount?: number;
  invitedCount?: number;
  consentPendingCount?: number;
}

export function LinkStatesSummary({
  linkedCount = 3,
  invitedCount = 2,
  consentPendingCount = 2,
}: LinkStatesSummaryProps) {
  return (
    <div className="rounded-[16px] border border-[#e7e9ee] bg-white p-6 shadow-2xs flex flex-col justify-between">
      <div>
        {/* TITLE & DESCRIPTION */}
        <h3 className="text-[16px] font-bold text-[#151b2b] tracking-[-0.01em]">
          Link states
        </h3>
        <p className="mt-1 text-[13px] text-[#777f90] leading-relaxed">
          Where your roster stands right now.
        </p>

        {/* 3 STAT CARDS */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* LINKED */}
          <div className="rounded-xl bg-[#eef7f2] p-4 flex flex-col justify-between border border-[#e0f1e7]/60">
            <div>
              <div className="flex items-center gap-2">
                <LinkIcon
                  size={16}
                  strokeWidth={2.4}
                  className="text-[#23805d]"
                />
                <span className="text-[26px] font-bold text-[#151b2b] leading-none">
                  {linkedCount}
                </span>
              </div>
              <h4 className="mt-3 text-[14px] font-bold text-[#23805d]">
                Linked
              </h4>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-[#5d6673]">
              Confirmed by the student. Counts towards your cohort.
            </p>
          </div>

          {/* INVITED */}
          <div className="rounded-xl bg-[#edf3fc] p-4 flex flex-col justify-between border border-[#dfeaf8]/60">
            <div>
              <div className="flex items-center gap-2">
                <Send
                  size={16}
                  strokeWidth={2.4}
                  className="text-[#3566b8]"
                />
                <span className="text-[26px] font-bold text-[#151b2b] leading-none">
                  {invitedCount}
                </span>
              </div>
              <h4 className="mt-3 text-[14px] font-bold text-[#3566b8]">
                Invited
              </h4>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-[#5d6673]">
              Invite sent. Nothing shared until they join.
            </p>
          </div>

          {/* CONSENT PENDING */}
          <div className="rounded-xl bg-[#fdf5e8] p-4 flex flex-col justify-between border border-[#f9edd8]/60">
            <div>
              <div className="flex items-center gap-2">
                <Hourglass
                  size={16}
                  strokeWidth={2.4}
                  className="text-[#8c681d]"
                />
                <span className="text-[26px] font-bold text-[#151b2b] leading-none">
                  {consentPendingCount}
                </span>
              </div>
              <h4 className="mt-3 text-[14px] font-bold text-[#8c681d]">
                Consent pending
              </h4>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-[#5d6673]">
              Linked, but score sharing not yet approved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
