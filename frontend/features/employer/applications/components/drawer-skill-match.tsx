import { Check } from "lucide-react";

interface SkillMatchSectionProps {
  matchedSkills: string[];
  otherCandidateSkills: string[];
  missingSkills: string[];
}

export function SkillMatchSection({
  matchedSkills,
  otherCandidateSkills,
  missingSkills,
}: SkillMatchSectionProps) {
  const hasSkills =
    matchedSkills.length > 0 ||
    otherCandidateSkills.length > 0 ||
    missingSkills.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#687384]">
        Skill match
      </span>

      {hasSkills ? (
        <div className="flex flex-wrap gap-2">
        {matchedSkills.map((skill) => (
          <span
            key={`matched-${skill}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf5ef] px-3 py-2 text-[12px] font-semibold leading-4 text-[#16845d]"
          >
            <Check size={12} strokeWidth={2.5} />

            {skill}
          </span>
        ))}

        {otherCandidateSkills.map((skill) => (
          <span
            key={`candidate-${skill}`}
            className="inline-flex items-center rounded-full bg-[#f3f4f7] px-3 py-2 text-[12px] font-semibold leading-4 text-[#4f5969]"
          >
            {skill}
          </span>
        ))}

        {missingSkills.map((skill) => (
          <span
            key={`missing-${skill}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#dfe3e9] bg-[#f3f4f7] px-3 py-2 text-[12px] font-semibold leading-4 text-[#8a92a0]"
          >
            {skill}
          </span>
        ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-[#dfe3e9] bg-[#f8f9fb] px-3 py-3 text-[12px] leading-5 text-[#687384]">
          Skill comparison is unavailable because no candidate or job skills were provided.
        </p>
      )}
    </div>
  );
}
