"use client";

import type { JobValidationErrors } from "../schemas/job.schema";
import { JOB_SKILLS } from "../data/skills.data";

interface JobSkillsFieldProps {
  value: string[];
  error?: JobValidationErrors["skills"];
  onChange: (skills: string[]) => void;
}

export function JobSkillsField({
  value,
  error,
  onChange,
}: JobSkillsFieldProps) {
  const toggle = (skill: string) => {
    onChange(
      value.includes(skill)
        ? value.filter((item) => item !== skill)
        : [...value, skill],
    );
  };

  return (
    <div>
      <span className="mb-1.5 block text-[12px] font-semibold leading-4 text-[#687386]">
        Required skills <span className="text-[#b42318]">*</span>
      </span>

      <div className="flex flex-wrap gap-2">
        {JOB_SKILLS.map((skill) => {
          const active = value.includes(skill);

          return (
            <button
              key={skill}
              type="button"
              onClick={() => toggle(skill)}
              aria-pressed={active}
              className={[
                "cursor-pointer rounded-full px-3 py-2 text-xs font-semibold transition",
                active
                  ? "bg-[#edf2fa] text-[#28578f] ring-1 ring-[#2f5da8]/20"
                  : "bg-[#f5f6f8] text-[#687386] hover:bg-[#edf0f4]",
              ].join(" ")}
            >
              {skill}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mt-1.5 text-xs font-medium text-[#b42318]">{error}</p>
      ) : null}
    </div>
  );
}
