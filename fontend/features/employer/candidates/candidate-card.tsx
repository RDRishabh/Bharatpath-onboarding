"use client";

import {
  BriefcaseBusiness,
  CheckCircle,
  EyeOff,
  LockKeyhole,
  MapPin,
  Star,
  Wallet,
} from "lucide-react";

import type { Candidate } from "./types";
import { bandMeta, maskName } from "./data";

interface CandidateCardProps {
  candidate: Candidate;
  onUnlock: (candidate: Candidate) => void;
}

/* =========================================================
   ADD-ON PILL
   Matches:
   background: var(--green-bg)
   color: var(--green-ink)
   ========================================================= */

function AddonPill({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className="flex h-[21px] shrink-0 items-center gap-[6px] rounded-full bg-[#e8f5ef] px-[9px]"
    >
      <CheckCircle
        size={12}
        strokeWidth={2.5}
        className="shrink-0 text-[#217653]"
        fill="currentColor"
        color="#217653"
      />

      <span className="whitespace-nowrap text-[11px] font-semibold leading-[14px] text-[#217653]">
        {children}
      </span>
    </span>
  );
}

/* =========================================================
   SKILL PILL
   ========================================================= */

function SkillPill({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full bg-[#f2f4f7] px-[9px] py-[4px] text-[11px] font-medium leading-[14px] text-[#273142]">
      {children}
    </span>
  );
}

/* =========================================================
   CANDIDATE CARD
   ========================================================= */

export function CandidateCard({
  candidate,
  onUnlock,
}: CandidateCardProps) {
  const band = bandMeta(candidate.exactScore);

  /*
   * Reference uses:
   *
   * var(--ink-muted)
   * var(--green-ink)
   * var(--indigo-ink)
   *
   * We map those values here so the card remains visually
   * identical without depending on global CSS variables.
   */

  const bandBackground =
    band.label === "Exceptional"
      ? "#5b4fcf"
      : band.label === "Strong"
        ? "#217653"
        : "#6c7684";

  /*
   * Avatar background follows the reference:
   *
   * Building     -> tint
   * Strong       -> green-bg
   * Exceptional  -> indigo-bg
   */

  const avatarBackground =
    band.label === "Exceptional"
      ? "#eeecff"
      : band.label === "Strong"
        ? "#e8f5ef"
        : "#f2f4f7";

  const avatarIconColor =
    band.label === "Exceptional"
      ? "#5b4fcf"
      : band.label === "Strong"
        ? "#217653"
        : "#6c7684";

  /*
   * Show first 5 skills, exactly like the reference.
   */
  const visibleSkills = candidate.skills.slice(0, 5);

  const remainingSkills =
    Math.max(candidate.skills.length - 5, 0);

  return (
    <article
      className="
        flex
        items-start
        gap-[16px]
        rounded-[12px]
        border
        border-[#e3e7eb]
        bg-white
        p-[16px]
        shadow-[0_2px_4px_rgba(19,26,38,0.04),0_8px_20px_rgba(19,26,38,0.05)]
      "
    >
      {/* =====================================================
          MASKED PROFILE ICON
          ===================================================== */}

      <span
        className="
          grid
          h-[44px]
          w-[44px]
          shrink-0
          place-items-center
          rounded-[12px]
        "
        style={{
          backgroundColor: avatarBackground,
        }}
      >
        <EyeOff
          size={18}
          strokeWidth={2}
          style={{
            color: avatarIconColor,
          }}
        />
      </span>

      {/* =====================================================
          CANDIDATE CONTENT
          ===================================================== */}

      <span
        className="
          flex
          min-w-0
          flex-1
          flex-col
          gap-[8px]
        "
      >
        {/* -------------------------------------------------
            NAME + SCORE + ADDONS
            ------------------------------------------------- */}

        <span
          className="
            flex
            flex-wrap
            items-center
            gap-[8px]
          "
        >
          {/* Candidate name */}
          <span
            className="
              min-w-0
              overflow-hidden
              text-ellipsis
              whitespace-nowrap
              text-[14px]
              font-semibold
              leading-[18px]
              text-[#202a3b]
            "
          >
            {candidate.unlocked
              ? candidate.name
              : maskName(candidate.name)}
          </span>

          {/* Score band */}
          <span
            className="
              flex
              h-[22px]
              shrink-0
              items-center
              gap-[5px]
              whitespace-nowrap
              rounded-full
              px-[8px]
              text-[11px]
              font-semibold
              leading-[14px]
              text-white
            "
            style={{
              backgroundColor: bandBackground,
            }}
          >
            <Star
              size={12}
              strokeWidth={0}
              fill="currentColor"
            />

            <span>{band.label}</span>
          </span>

          {/* Mock interview */}
          {candidate.badges.includes("mock") && (
            <AddonPill title="Mock interview completed">
              Mock interview
            </AddonPill>
          )}

          {/* Attribute check */}
          {candidate.badges.includes("attribute") && (
            <AddonPill title="Attribute check completed">
              Attribute check
            </AddonPill>
          )}

          {/* Two add-ons */}
          {candidate.badges.includes("addons") && (
            <AddonPill title="Mock interview completed, Attribute check completed">
              2 add-ons
            </AddonPill>
          )}
        </span>

        {/* -------------------------------------------------
            LOCATION / EXPERIENCE / SALARY
            ------------------------------------------------- */}

        <span
          className="
            flex
            flex-wrap
            items-center
            gap-x-[8px]
            gap-y-[4px]
          "
        >
          {/* Location */}
          <span
            className="
              flex
              items-center
              gap-[6px]
              text-[12px]
              font-normal
              leading-[17px]
              text-[#6c7684]
            "
          >
            <MapPin
              size={14}
              strokeWidth={2}
            />

            <span>{candidate.location}</span>
          </span>

          {/* Experience */}
          <span
            className="
              flex
              items-center
              gap-[6px]
              text-[12px]
              font-normal
              leading-[17px]
              text-[#6c7684]
            "
          >
            <BriefcaseBusiness
              size={14}
              strokeWidth={2}
            />

            <span>
              {candidate.experienceYears}{" "}
              {candidate.experienceYears === 1
                ? "yr"
                : "yrs"}{" "}
              exp
            </span>
          </span>

          {/* Salary */}
          <span
            className="
              flex
              items-center
              gap-[6px]
              text-[12px]
              font-normal
              leading-[17px]
              text-[#6c7684]
            "
          >
            <Wallet
              size={14}
              strokeWidth={2}
            />

            <span>
              ₹
              {candidate.salaryMin.toLocaleString(
                "en-IN"
              )}
              –
              {candidate.salaryMax.toLocaleString(
                "en-IN"
              )}
            </span>
          </span>
        </span>

        {/* -------------------------------------------------
            SKILLS
            ------------------------------------------------- */}

        <span
          className="
            flex
            flex-wrap
            items-center
            gap-[6px]
          "
        >
          {visibleSkills.map((skill) => (
            <SkillPill key={skill}>
              {skill}
            </SkillPill>
          ))}

          {remainingSkills > 0 && (
            <span
              className="
                px-[2px]
                py-[4px]
                text-[11px]
                font-medium
                leading-[14px]
                text-[#6c7684]
              "
            >
              +{remainingSkills} more
            </span>
          )}
        </span>
      </span>

      {/* =====================================================
          UNLOCK BUTTON
          ===================================================== */}

      <span
        className="
          flex
          shrink-0
          items-center
          gap-[10px]
        "
      >
        <button
          type="button"
          aria-label="Unlock candidate"
          onClick={() => onUnlock(candidate)}
          className="
            flex
            h-[35px]
            shrink-0
            cursor-pointer
            items-center
            gap-[6px]
            whitespace-nowrap
            rounded-[8px]
            border
            border-[rgba(91,79,207,0.22)]
            bg-[rgba(91,79,207,0.10)]
            px-[14px]
            text-[13px]
            font-semibold
            leading-[16px]
            text-[#3d3494]
            transition-colors
            hover:bg-[rgba(91,79,207,0.16)]
            active:bg-[rgba(91,79,207,0.20)]
          "
        >
          {/* Lock icon */}
          <span className="relative flex h-[12px] w-[12px] shrink-0 items-center justify-center">
            <LockKeyhole
              size={14}
              strokeWidth={2}
              className="absolute text-[#3d3494]"
            />
          </span>

          <span>Unlock</span>
        </button>
      </span>
    </article>
  );
}