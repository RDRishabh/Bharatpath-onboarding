"use client";

import { ChevronRight, Search } from "lucide-react";
import { useState } from "react";

import {
  ADDONS,
  BAND_DEFS,
  EXPERIENCE_DEFS,
  LOCATIONS,
  SKILLS,
} from "./data";

import type { CandidateFiltersState } from "./types";

interface CandidateFiltersProps {
  filters: CandidateFiltersState;
  onChange: (next: CandidateFiltersState) => void;
}

export function CandidateFilters({
  filters,
  onChange,
}: CandidateFiltersProps) {
  const toggle = (
    key: keyof CandidateFiltersState,
    value: string,
  ) => {
    const values = filters[key] as string[];

    onChange({
      ...filters,
      [key]: values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    });
  };

  return (
    <aside className="flex h-full w-[268px] shrink-0 flex-col border-l border-[#e7eaef] bg-white">
      {/* =================================================
          FILTER CONTENT
          ================================================= */}
      <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-[18px] pb-[64px] pt-4">
        {/* =================================================
            HEADER
            ================================================= */}
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold leading-[18px] text-[#182132]">
            Filters
          </span>
        </div>

        {/* =================================================
            SEARCH
            ================================================= */}
        <div className="flex h-[40px] items-center gap-[10px] rounded-[10px] border border-[#e7eaef] bg-[#f8f9fb] px-[10px] py-[12px]">
          <Search
            size={14}
            strokeWidth={2}
            className="shrink-0 text-[#687386]"
          />

          <input
            type="text"
            value={filters.search}
            onChange={(e) =>
              onChange({
                ...filters,
                search: e.target.value,
              })
            }
            placeholder="Skill, role or area"
            aria-label="Search candidates"
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-normal leading-[18px] text-[#182132] outline-none placeholder:text-[#687386]"
          />
        </div>

        {/* =================================================
            SCORE BAND
            ================================================= */}
        <FilterSection title="SCORE BAND">
          <div className="flex flex-col gap-[2px]">
            {BAND_DEFS.map((item) => (
              <CheckRow
                key={item.key}
                label={item.label}
                checked={filters.bands.includes(item.key)}
                onClick={() =>
                  toggle("bands", item.key)
                }
              />
            ))}
          </div>
        </FilterSection>

        <Divider />

        {/* =================================================
            SKILLS
            ================================================= */}
        <FilterSection title="SKILLS">
          <div className="flex flex-wrap gap-[6px]">
            {SKILLS.map((skill) => {
              const active =
                filters.skills.includes(skill);

              return (
                <button
                  key={skill}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    toggle("skills", skill)
                  }
                  className={[
                    "inline-flex cursor-pointer items-center gap-[5px]",
                    "rounded-full px-[10px] py-[6px]",
                    "text-[11px] font-semibold leading-[14px]",
                    "transition-colors",
                    active
                      ? "bg-[#e9e5ff] text-[#51449a]"
                      : "bg-[#f2f4f7] text-[#687386]",
                  ].join(" ")}
                >
                  {skill}
                </button>
              );
            })}
          </div>
        </FilterSection>

        <Divider />

        {/* =================================================
            LOCATION
            ================================================= */}
        <FilterSection title="LOCATION">
          <div className="flex flex-col gap-[2px]">
            {LOCATIONS.map((location) => (
              <CheckRow
                key={location}
                label={location}
                checked={filters.locations.includes(
                  location,
                )}
                onClick={() =>
                  toggle("locations", location)
                }
              />
            ))}
          </div>
        </FilterSection>

        <Divider />

        {/* =================================================
            EXPERIENCE
            ================================================= */}
        <FilterSection title="EXPERIENCE">
          <div className="flex flex-col gap-[2px]">
            {EXPERIENCE_DEFS.map((item) => (
              <CheckRow
                key={item.key}
                label={item.label}
                checked={filters.experiences.includes(
                  item.key,
                )}
                onClick={() =>
                  toggle(
                    "experiences",
                    item.key,
                  )
                }
              />
            ))}
          </div>
        </FilterSection>

        <Divider />

        {/* =================================================
            COMPLETED ADD ONS
            ================================================= */}
        <FilterSection title="COMPLETED ADD ONS">
          <div className="flex flex-col gap-[2px]">
            {ADDONS.map((item) => (
              <CheckRow
                key={item.key}
                label={item.label}
                checked={filters.addons.includes(
                  item.key,
                )}
                onClick={() =>
                  toggle(
                    "addons",
                    item.key,
                  )
                }
              />
            ))}
          </div>
        </FilterSection>
      </div>
    </aside>
  );
}

/* =========================================================
   FILTER SECTION
   ========================================================= */

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="flex flex-col gap-[10px]">
      {/* Section heading */}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-[6px] text-left"
      >
        <ChevronRight
          size={10}
          strokeWidth={2}
          className={`shrink-0 text-[#687386] transition-transform duration-150 ${
            open ? "rotate-90" : ""
          }`}
        />

        <span className="text-[11px] font-bold leading-[14px] tracking-[0.06em] text-[#687386]">
          {title}
        </span>
      </button>

      {/* Section content */}
      {open && children}
    </section>
  );
}

/* =========================================================
   DIVIDER
   ========================================================= */

function Divider() {
  return (
    <div className="h-px w-full shrink-0 bg-[#eef0f3]" />
  );
}

/* =========================================================
   RADIO / CHECK ROW
   ========================================================= */

function CheckRow({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-[8px] rounded-[8px] p-[4px] text-left transition-colors hover:bg-[#f8f9fb]"
    >
      {/* Radio */}
      <span
        className={[
          "grid h-[16px] w-[16px] shrink-0 place-items-center rounded-full border",
          checked
            ? "border-[#5b4fcf] bg-[#5b4fcf]"
            : "border-[#dfe3e9] bg-white",
        ].join(" ")}
      >
        {checked && (
          <span className="h-[6px] w-[6px] rounded-full bg-white" />
        )}
      </span>

      {/* Label */}
      <span className="text-[13px] font-medium leading-[17px] text-[#273142]">
        {label}
      </span>
    </button>
  );
}