"use client";

import { useState } from "react";
import {
  Briefcase,
  Check,
  Copy,
  Gauge,
  Mail,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";

import { usePageHeader } from "@/components/layout/header-context";
import { CollegeDashboard as DashboardData } from "../types";
import { MetricCard } from "../../../../components/common/dashboard/metric-card";
import { RecentActivityList } from "../../../../components/common/dashboard/recent-activity";
import { ScoreDistribution } from "./score-distribution";

export function CollegeDashboard({
  data,
}: {
  data: DashboardData;
}) {
  usePageHeader(
    "Dashboard",
    "Cohort overview, linking code and recent activity",
    {
      stat: {
        icon: Users,
        label: `${data.seats.used} / ${data.seats.total} seats used`,
        sublabel: `${Math.max(
          data.seats.total - data.seats.used,
          0,
        )} seats remaining`,
        progress:
          data.seats.total > 0
            ? (data.seats.used / data.seats.total) * 100
            : 0,
      },
    },
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Students linked"
          value={data.stats.studentsLinked}
          icon={Users}
          tone="purple"
        />

        <MetricCard
          title="Consent shared"
          value={data.stats.consentShared}
          icon={ShieldCheck}
          tone="green"
        />

        <MetricCard
          title="Average score"
          value={data.stats.averageScore}
          icon={Gauge}
          tone="blue"
        />

        <MetricCard
          title="Hired via platform"
          value={data.stats.hiredViaPlatform}
          icon={Briefcase}
          tone="orange"
        />
      </div>

      {/* Main dashboard */}
      <div className="grid items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Left column */}
        <div className="flex min-w-0 flex-col gap-4">
          <ScoreDistribution
            bands={data.scoreBands}
            averageScore={data.stats.averageScore}
          />

          <ReferralCode code={data.referralCode} />
        </div>

        {/* Right column */}
        <RecentActivityList
          activities={data.recentActivity}
        />
      </div>
    </div>
  );
}

function ReferralCode({
  code,
}: {
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="
        flex flex-col gap-3
        rounded-xl
        border border-[#e5e7ec]
        bg-white
        p-5
        shadow-[0_4px_12px_rgba(19,26,38,0.024)]
      "
    >
      {/* Header */}
      <div className="flex flex-col gap-[2px]">
        <h2
          className="
            text-[14px]
            font-[600]
            leading-[18px]
            text-[#151b2b]
          "
          style={{
            fontFamily: "'General Sans', sans-serif",
            fontWeight: 600,
          }}
        >
          Referral code
        </h2>

        <p
          className="
            text-[12px]
            font-[400]
            leading-[17px]
            text-[#303747]
          "
          style={{
            fontFamily: "'General Sans', sans-serif",
            fontWeight: 400,
          }}
        >
          Students enter this code in the BharatPath app
          to link their account to your institution.
        </p>
      </div>

      {/* Referral code */}
      <div
        className="
          flex
          items-center
          gap-[10px]
          rounded-xl
          border
          border-dashed
          border-[#e5e7ec]
          bg-[#f5f6f8]
          px-4
          py-3
        "
      >
        <code
          className="
            min-w-0
            flex-1
            truncate
            text-[18px]
            font-[700]
            leading-[23px]
            tracking-[0.04em]
            text-[#151b2b]
          "
          style={{
            fontFamily: "'General Sans', sans-serif",
            fontWeight: 700,
          }}
        >
          {code}
        </code>

        <button
          type="button"
          onClick={handleCopy}
          className="
            flex
            shrink-0
            items-center
            gap-[6px]
            rounded-lg
            border
            border-[#e5e7ec]
            bg-white
            px-3
            py-2
            text-[12px]
            font-[600]
            leading-[16px]
            text-[#151b2b]
            transition-colors
            hover:bg-[#f8f9fb]
          "
          style={{
            fontFamily: "'General Sans', sans-serif",
            fontWeight: 600,
          }}
        >
          {copied ? (
            <Check size={14} strokeWidth={2} />
          ) : (
            <Copy size={14} strokeWidth={2} />
          )}

          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex gap-[10px] border-t border-[#eef0f3] pt-3">
        <QuickAction
          icon={Mail}
          label="Invite students by email"
        />

        <QuickAction
          icon={Upload}
          label="Bulk upload a roster"
        />
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
}: {
  icon: typeof Mail;
  label: string;
}) {
  return (
    <button
      type="button"
      className="
        flex
        min-w-0
        flex-1
        items-center
        gap-[10px]
        rounded-[10px]
        border
        border-[#e5e7ec]
        bg-white
        p-3
        text-left
        transition-colors
        hover:bg-[#f8f9fb]
      "
    >
      <span
        className="
          grid
          h-8
          w-8
          shrink-0
          place-items-center
          rounded-lg
          bg-[#eef0ff]
        "
      >
        <Icon
          size={16}
          strokeWidth={2}
          className="text-[#4e43b7]"
        />
      </span>

      <span
        className="
          min-w-0
          flex-1
          text-[13px]
          font-[600]
          leading-[17px]
          text-[#151b2b]
        "
        style={{
          fontFamily: "'General Sans', sans-serif",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </button>
  );
}