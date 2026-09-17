"use client";

import { BadgeCheck } from "lucide-react";

import { useAppDispatch } from "@/store/hooks";
import { updateProfileField } from "@/store/college/settings/college-settings.slice";

import { useSettings } from "../hooks/use-settings";

export function CollegeProfile() {
  const dispatch = useAppDispatch();

  const {
    profile,
    saveProfile,
    isSavingProfile,
  } = useSettings();

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
          Shown to employers alongside your students&apos;
          verified scores.
        </p>
      </div>

      {/* Legal institution name */}
      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold leading-[17px] text-[#131A26]">
          Legal institution name
        </span>

        <input
          type="text"
          value={profile.legalInstitutionName}
          placeholder="Sinhgad Technical Education Society"
          aria-label="Legal institution name"
          onChange={(event) =>
            dispatch(
              updateProfileField({
                field: "legalInstitutionName",
                value: event.target.value,
              }),
            )
          }
          className="w-full rounded-[10px] border border-[#e1e5eb] bg-white px-4 py-3 text-[14px] font-medium leading-5 text-[#131A26] outline-none transition placeholder:text-[#64748b] focus:border-[#3566b8] focus:ring-2 focus:ring-[#3566b8]/10"
        />
      </label>

      {/* AICTE + City */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* AICTE code */}
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold leading-[17px] text-[#131A26]">
            AICTE code
          </span>

          <input
            type="text"
            value={profile.aicteCode}
            placeholder="1-4258963"
            aria-label="AICTE code"
            onChange={(event) =>
              dispatch(
                updateProfileField({
                  field: "aicteCode",
                  value: event.target.value,
                }),
              )
            }
            className="w-full rounded-[10px] border border-[#e1e5eb] bg-white px-4 py-3 text-[14px] font-medium leading-5 text-[#131A26] outline-none transition placeholder:text-[#64748b] focus:border-[#3566b8] focus:ring-2 focus:ring-[#3566b8]/10"
          />
        </label>

        {/* City */}
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold leading-[17px] text-[#131A26]">
            City
          </span>

          <input
            type="text"
            value={profile.city}
            placeholder="Pune"
            aria-label="City"
            onChange={(event) =>
              dispatch(
                updateProfileField({
                  field: "city",
                  value: event.target.value,
                }),
              )
            }
            className="w-full rounded-[10px] border border-[#e1e5eb] bg-white px-4 py-3 text-[14px] font-medium leading-5 text-[#131A26] outline-none transition placeholder:text-[#64748b] focus:border-[#3566b8] focus:ring-2 focus:ring-[#3566b8]/10"
          />
        </label>
      </div>

      {/* Verification */}
      {profile.verified && (
        <div className="flex items-center gap-[10px] rounded-[10px] bg-[#eaf6f0] px-4 py-3">
          <BadgeCheck
            size={16}
            strokeWidth={2}
            className="shrink-0 text-[#00845a]"
          />

          <span className="flex-1 text-[12px] font-medium leading-4 text-[#00845a]">
            Institution verified on {profile.verifiedOn}
          </span>
        </div>
      )}

      {/* Save */}
      <button
        type="button"
        disabled={isSavingProfile}
        onClick={saveProfile}
        className="self-start rounded-[8px] border-0 bg-[#5a4bd6] px-4 py-[10px] text-[13px] font-semibold leading-[17px] text-white transition hover:bg-[#4f41c8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSavingProfile ? "Saving..." : "Save changes"}
      </button>
    </section>
  );
}