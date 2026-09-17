"use client";

import {
  X,
  Check,
} from "lucide-react";

import type {
  EmployerApplication,
  ApplicationStage,
} from "../types";

interface ApplicationDrawerProps {
  application: EmployerApplication | null;

  onClose: () => void;

  onMoveStage: (
    stage: ApplicationStage,
  ) => void;

  onMeetingLinkChange: (
    value: string,
  ) => void;

  onConfirmHire: () => void;

  onRequestUnlock?: () => void;
}

/* =========================================================
   TYPES
   ========================================================= */

type CandidateData = {
  id: string;
  name: string;
  skills: string[];
  unlocked: boolean;
};

type JobData = {
  id: string;
  title: string;
  skills: string[];
};

/* =========================================================
   REFERENCE DATA
   These mirror the BharatPath Employer Portal data.
   ========================================================= */

const CANDIDATES: CandidateData[] = [
  {
    id: "c1",
    name: "S. Deshmukh",
    skills: [
      "Quality inspection",
      "MS Excel",
      "Basic English",
      "Documentation",
      "Attention to detail",
      "Batch testing",
    ],
    unlocked: true,
  },

  {
    id: "c2",
    name: "A. Kulkarni",
    skills: [
      "Team supervision",
      "Safety compliance",
      "Shift planning",
      "Basic English",
      "Inventory mgmt",
      "MS Excel",
    ],
    unlocked: false,
  },

  {
    id: "c3",
    name: "R. Patil",
    skills: [
      "Quality inspection",
      "Forklift certified",
      "Inventory mgmt",
      "Team supervision",
      "Safety compliance",
      "Warehouse ops",
      "MS Excel",
    ],
    unlocked: false,
  },

  {
    id: "c4",
    name: "M. Shaikh",
    skills: [
      "Packaging",
      "Basic English",
    ],
    unlocked: false,
  },

  {
    id: "c5",
    name: "V. Joshi",
    skills: [
      "Machine operation",
      "Hindi typing",
      "Safety compliance",
      "Basic English",
      "Inventory mgmt",
    ],
    unlocked: false,
  },

  {
    id: "c6",
    name: "N. Gaikwad",
    skills: [
      "MS Excel",
      "Customer service",
      "Team supervision",
      "Basic English",
      "Shift planning",
      "Documentation",
    ],
    unlocked: false,
  },
];

const JOBS: JobData[] = [
  {
    id: "j1",
    title: "Lab Analyst Trainee",
    skills: [
      "Quality inspection",
      "MS Excel",
    ],
  },

  {
    id: "j2",
    title: "Quality Control Trainee",
    skills: [
      "Quality inspection",
      "Safety compliance",
    ],
  },

  {
    id: "j4",
    title: "Packaging Operator",
    skills: [
      "Packaging",
    ],
  },
];

/* =========================================================
   STAGES
   ========================================================= */

const STAGES: {
  value: ApplicationStage;
  label: string;
}[] = [
  {
    value: 0,
    label: "Submitted",
  },
  {
    value: 1,
    label: "Viewed",
  },
  {
    value: 2,
    label: "Shortlisted",
  },
  {
    value: 3,
    label: "Interview",
  },
  {
    value: 4,
    label: "Hired / Rejected",
  },
];

/* =========================================================
   BAND
   ========================================================= */

function getBand(score: number) {
  if (score >= 900) {
    return {
      label: "Exceptional",
      background: "#eef8f3",
      color: "#16845d",
    };
  }

  if (score >= 800) {
    return {
      label: "Strong",
      background: "#edf3fb",
      color: "#28578f",
    };
  }

  if (score >= 700) {
    return {
      label: "Building",
      background: "#f5f1e8",
      color: "#8b6b25",
    };
  }

  return {
    label: "Developing",
    background: "#f3f4f7",
    color: "#687384",
  };
}

/* =========================================================
   COMPONENT
   ========================================================= */

export function ApplicationDrawer({
  application,
  onClose,
  onMoveStage,
  onMeetingLinkChange,
  onConfirmHire,
  onRequestUnlock,
}: ApplicationDrawerProps) {
  if (!application) {
    return null;
  }

  /*
   * Find the complete candidate/job records from the IDs
   * stored inside EmployerApplication.
   */
  const candidate =
    CANDIDATES.find(
      (item) =>
        item.id === application.candidate.id,
    ) ?? {
      id: application.candidate.id,
      name: application.candidate.name,
      skills: [],
      unlocked: application.candidate.unlocked,
    };

  const job =
    JOBS.find(
      (item) =>
        item.id === application.jobId,
    ) ?? {
      id: application.jobId,
      title: application.candidate.jobTitle,
      skills: [],
    };

  const band = getBand(
    application.candidate.exactScore,
  );

  const matchedSkills =
    candidate.skills.filter((skill) =>
      job.skills.includes(skill),
    );

  const otherCandidateSkills =
    candidate.skills.filter(
      (skill) =>
        !matchedSkills.includes(skill),
    );

  const missingSkills =
    job.skills.filter(
      (skill) =>
        !candidate.skills.includes(skill),
    );

  const isMasked =
    !application.candidate.unlocked;

  const currentStage =
    Number(application.stage);

  const currentStageLabel =
    STAGES[currentStage]?.label ??
    "Submitted";

  const canConfirmHire =
    currentStage === 4 &&
    !application.hireEmployerConfirmed;

  return (
    <div
      className="
        fixed
        inset-0
        z-50
      "
    >
      {/* =====================================================
          BACKDROP
          ===================================================== */}

      <button
        type="button"
        aria-label="Close application drawer"
        onClick={onClose}
        className="
          absolute
          inset-0
          cursor-default
          bg-[rgba(19,26,38,0.4)]
        "
      />

      {/* =====================================================
          DRAWER
          ===================================================== */}

      <aside
        className="
          absolute
          right-0
          top-0
          flex
          h-full
          w-[520px]
          max-w-[100vw]
          flex-col
          bg-white
          shadow-[-8px_0_30px_rgba(19,26,38,0.14)]
        "
      >
        {/* ===================================================
            HEADER
            =================================================== */}

        <div
          className="
            flex
            shrink-0
            items-center
            gap-3
            border-b
            border-[#e7e9ee]
            px-6
            py-5
          "
        >
          <div
            className="
              flex
              min-w-0
              flex-1
              flex-col
              gap-[2px]
            "
          >
            <span
              className="
                truncate
                text-[16px]
                font-semibold
                leading-[21px]
                text-[#151b2b]
              "
            >
              {isMasked
                ? `Masked · ${candidate.id.toUpperCase()}`
                : candidate.name}
            </span>

            <span
              className="
                truncate
                text-[12px]
                font-normal
                leading-[17px]
                text-[#777f90]
              "
            >
              Applied to {job.title} ·{" "}
              {application.appliedDate}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="
              grid
              h-8
              w-8
              shrink-0
              cursor-pointer
              place-items-center
              rounded-lg
              border
              border-[#e1e5eb]
              bg-white
              text-[#151b2b]
              transition
              hover:bg-[#f3f4f7]
            "
          >
            <X size={14} />
          </button>
        </div>

        {/* ===================================================
            CONTENT
            =================================================== */}

        <div
          className="
            flex-1
            overflow-y-auto
            px-6
            py-6
          "
        >
          <div
            className="
              flex
              flex-col
              gap-5
            "
          >
            {/* =================================================
                SCORE BAND
                ================================================= */}

            <span
              className="
                w-fit
                rounded-md
                px-3
                py-1.5
                text-[11px]
                font-bold
                uppercase
                tracking-[0.04em]
              "
              style={{
                backgroundColor:
                  band.background,
                color: band.color,
              }}
            >
              {band.label} ·{" "}
              {application.candidate.exactScore}
            </span>

            {/* =================================================
                STAGE PROGRESS
                ================================================= */}

            <div
              className="
                flex
                flex-col
                gap-2
              "
            >
              <div
                className="
                  flex
                  gap-1
                "
              >
                {STAGES.map(
                  (stage) => {
                    const active =
                      Number(stage.value) <=
                      currentStage;

                    return (
                      <span
                        key={stage.value}
                        className="
                          h-1
                          flex-1
                          rounded-full
                        "
                        style={{
                          backgroundColor:
                            active
                              ? "#3566b8"
                              : "#e7e9ee",
                        }}
                      />
                    );
                  },
                )}
              </div>

              <div
                className="
                  flex
                  items-center
                  justify-between
                "
              >
                <span
                  className="
                    text-[11px]
                    font-bold
                    uppercase
                    tracking-[0.05em]
                    text-[#687384]
                  "
                >
                  Stage {currentStage + 1} of 5
                </span>

                <span
                  className="
                    text-[11px]
                    font-medium
                    text-[#687384]
                  "
                >
                  {currentStageLabel}
                </span>
              </div>
            </div>

            {/* =================================================
                SKILL MATCH
                ================================================= */}

            <div
              className="
                flex
                flex-col
                gap-2
              "
            >
              <span
                className="
                  text-[11px]
                  font-bold
                  uppercase
                  tracking-[0.06em]
                  text-[#687384]
                "
              >
                Skill match
              </span>

              <div
                className="
                  flex
                  flex-wrap
                  gap-2
                "
              >
                {/* Matched */}

                {matchedSkills.map(
                  (skill) => (
                    <span
                      key={`matched-${skill}`}
                      className="
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-full
                        bg-[#eaf5ef]
                        px-3
                        py-2
                        text-[12px]
                        font-semibold
                        leading-4
                        text-[#16845d]
                      "
                    >
                      <Check
                        size={12}
                        strokeWidth={2.5}
                      />

                      {skill}
                    </span>
                  ),
                )}

                {/* Candidate skills */}

                {otherCandidateSkills.map(
                  (skill) => (
                    <span
                      key={`candidate-${skill}`}
                      className="
                        inline-flex
                        items-center
                        rounded-full
                        bg-[#f3f4f7]
                        px-3
                        py-2
                        text-[12px]
                        font-semibold
                        leading-4
                        text-[#4f5969]
                      "
                    >
                      {skill}
                    </span>
                  ),
                )}

                {/* Missing */}

                {missingSkills.map(
                  (skill) => (
                    <span
                      key={`missing-${skill}`}
                      className="
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-full
                        border
                        border-dashed
                        border-[#dfe3e9]
                        bg-[#f3f4f7]
                        px-3
                        py-2
                        text-[12px]
                        font-semibold
                        leading-4
                        text-[#8a92a0]
                      "
                    >
                      {skill}
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* =================================================
                UNLOCK BUTTON
                ================================================= */}

            {isMasked && (
              <button
                type="button"
                onClick={onRequestUnlock}
                className="
                  flex
                  h-[44px]
                  w-full
                  cursor-pointer
                  items-center
                  justify-center
                  rounded-lg
                  border-0
                  bg-[#5b4fcf]
                  px-4
                  text-[14px]
                  font-semibold
                  leading-[18px]
                  text-white
                  transition
                  hover:bg-[#5145c2]
                  active:scale-[0.99]
                "
              >
                Unlock candidate · 1 credit
              </button>
            )}

            {/* =================================================
                MOVE STAGE
                ================================================= */}

            <div
              className="
                flex
                flex-col
                gap-2
              "
            >
              <span
                className="
                  text-[11px]
                  font-bold
                  uppercase
                  tracking-[0.06em]
                  text-[#687384]
                "
              >
                Move stage
              </span>

              <div
                className="
                  flex
                  flex-wrap
                  gap-2
                "
              >
                {STAGES.map(
                  (stage) => {
                    const active =
                      Number(stage.value) ===
                      currentStage;

                    return (
                      <button
                        key={stage.value}
                        type="button"
                        onClick={() =>
                          onMoveStage(
                            stage.value,
                          )
                        }
                        className={`
                          rounded-full
                          px-3
                          py-2
                          text-[12px]
                          font-semibold
                          leading-4
                          transition
                          ${
                            active
                              ? "cursor-pointer border border-[#151b2b] bg-[#151b2b] text-white"
                              : "cursor-pointer border border-[#e1e5eb] bg-white text-[#4f5969] hover:bg-[#f3f4f7]"
                          }
                        `}
                      >
                        {stage.label}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {/* =================================================
                INTERVIEW
                ================================================= */}

            {currentStage === 3 && (
              <label
                className="
                  flex
                  flex-col
                  gap-1.5
                "
              >
                <span
                  className="
                    text-[11px]
                    font-bold
                    uppercase
                    tracking-[0.06em]
                    text-[#687384]
                  "
                >
                  Meeting link
                </span>

                <input
                  type="text"
                  value={
                    application.meetingLink
                  }
                  onChange={(event) =>
                    onMeetingLinkChange(
                      event.target.value,
                    )
                  }
                  placeholder="https://meet.google.com/..."
                  className="
                    h-10
                    w-full
                    rounded-lg
                    border
                    border-[#dfe3e9]
                    bg-white
                    px-3
                    text-[12px]
                    text-[#151b2b]
                    outline-none
                    placeholder:text-[#a1a8b3]
                    focus:border-[#315f9b]
                    focus:ring-2
                    focus:ring-[#315f9b]/10
                  "
                />
              </label>
            )}

            {/* =================================================
                HIRE
                ================================================= */}

            {currentStage === 4 && (
              <div
                className="
                  flex
                  flex-col
                  gap-2.5
                  rounded-[10px]
                  bg-[#f3f4f7]
                  p-4
                "
              >
                <span
                  className="
                    text-[13px]
                    font-semibold
                    leading-[17px]
                    text-[#151b2b]
                  "
                >
                  Confirm hire
                </span>

                <span
                  className="
                    text-[12px]
                    font-normal
                    leading-[17px]
                    text-[#4f5969]
                  "
                >
                  {application.hireEmployerConfirmed &&
                  application.hireCandidateConfirmed
                    ? "Both sides confirmed. This hire is final."
                    : application.hireEmployerConfirmed
                      ? "You’ve confirmed. Waiting on the candidate to confirm from their app."
                      : "Move this applicant to the final stage, then confirm from your side. The candidate confirms separately before it counts as a billable hire."}
                </span>

                {canConfirmHire && (
                  <button
                    type="button"
                    onClick={onConfirmHire}
                    className="
                      mt-1
                      flex
                      h-10
                      w-full
                      cursor-pointer
                      items-center
                      justify-center
                      rounded-lg
                      border-0
                      bg-[#16845d]
                      px-4
                      text-[13px]
                      font-semibold
                      text-white
                      transition
                      hover:bg-[#11734f]
                    "
                  >
                    Mark as hired
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}