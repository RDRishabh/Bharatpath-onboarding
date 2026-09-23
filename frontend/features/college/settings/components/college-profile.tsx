"use client";

import { BadgeCheck, Loader2 } from "lucide-react";

import { Skeleton } from "@/components/common/loading";

import { useSettings } from "../hooks/use-settings";
import { INSTITUTION_TYPE_OPTIONS } from "../types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function CollegeProfile() {
  const {
    organisation,
    isLoadingProfile,
    draftName,
    setDraftName,
    draftInstitutionType,
    setDraftInstitutionType,
    saveProfile,
    isSavingProfile,
  } = useSettings();

  if (isLoadingProfile) {
    return (
      <section
        aria-busy="true"
        className="flex w-full max-w-[640px] flex-col gap-4 rounded-[12px] border border-[#e1e5eb] bg-white p-5 shadow-[0_4px_12px_rgba(19,26,38,0.024)]"
      >
        <div className="flex flex-col gap-2">
          <Skeleton width={140} height={16} radius={6} />
          <Skeleton width={280} height={12} radius={6} />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton width={120} height={12} radius={6} />
          <Skeleton height={46} radius={10} />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton width={120} height={12} radius={6} />
          <Skeleton height={46} radius={10} />
        </div>
        <Skeleton width={132} height={40} radius={8} />
      </section>
    );
  }

  return (
    <section
      className="flex w-full max-w-[640px] flex-col gap-4 rounded-[12px] border border-[#e1e5eb] bg-white p-5 shadow-[0_4px_12px_rgba(19,26,38,0.024)]"
      style={{
        fontFamily: "'General Sans', sans-serif",
      }}
    >
      {/* Header */}
      <div className="flex flex-col gap-[2px]">
        <h2 className="text-[14px] font-semibold leading-[18px] text-[#131A26]">
          College profile
        </h2>

        <p className="text-[12px] font-normal leading-[17px] text-[#64748b]">
          Shown to employers alongside your students&apos; verified scores.
        </p>
      </div>

      {/* Institution name */}
      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold leading-[17px] text-[#131A26]">
          Institution name
        </span>

        <input
          type="text"
          value={draftName}
          placeholder="Sinhgad Technical Education Society"
          aria-label="Institution name"
          onChange={(event) => setDraftName(event.target.value)}
          className="w-full rounded-[10px] border border-[#e1e5eb] bg-white px-4 py-3 text-[14px] font-medium leading-5 text-[#131A26] outline-none transition placeholder:text-[#64748b] focus:border-[#3566b8] focus:ring-2 focus:ring-[#3566b8]/10"
        />
      </label>

      {/* Institution type */}
      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold leading-[17px] text-[#131A26]">
          Institution type
        </span>

        <select
          value={draftInstitutionType ?? ""}
          aria-label="Institution type"
          onChange={(event) =>
            setDraftInstitutionType(event.target.value || null)
          }
          className="w-full rounded-[10px] border border-[#e1e5eb] bg-white px-4 py-3 text-[14px] font-medium leading-5 text-[#131A26] outline-none transition focus:border-[#3566b8] focus:ring-2 focus:ring-[#3566b8]/10"
        >
          <option value="">Select a type</option>
          {INSTITUTION_TYPE_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {/* Verification */}
      {organisation?.verifiedAt && (
        <div className="flex items-center gap-[10px] rounded-[10px] bg-[#eaf6f0] px-4 py-3">
          <BadgeCheck
            size={16}
            strokeWidth={2}
            className="shrink-0 text-[#00845a]"
          />

          <span className="flex-1 text-[12px] font-medium leading-4 text-[#00845a]">
            Institution verified on {formatDate(organisation.verifiedAt)}
          </span>
        </div>
      )}

      {/* Save */}
      <button
        type="button"
        disabled={isSavingProfile || !draftName.trim()}
        onClick={saveProfile}
        aria-busy={isSavingProfile || undefined}
        className="inline-flex items-center justify-center gap-1.5 self-start rounded-[8px] border-0 bg-[#5a4bd6] px-4 py-[10px] text-[13px] font-semibold leading-[17px] text-white transition hover:bg-[#4f41c8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSavingProfile && (
          <Loader2 aria-hidden="true" size={14} className="animate-spin" />
        )}
        {isSavingProfile ? "Saving..." : "Save changes"}
      </button>
    </section>
  );
}
