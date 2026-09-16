"use client";

import {
  ListChecks,
  Plus,
  Search,
} from "lucide-react";

interface QuickActionsProps {
  onPostJob?: () => void;
  onSearchCandidates?: () => void;
  onReviewApplications?: () => void;
}

export function QuickActions({
  onPostJob,
  onSearchCandidates,
  onReviewApplications,
}: QuickActionsProps) {
  const actions = [
    {
      label: "Post a job",
      icon: Plus,
      onClick: onPostJob,
      iconWrapperClass:
        "bg-[#edf2fa]",
      iconClass:
        "text-[#3566b8]",
      cardClass:
        "py-8",
    },
    {
      label: "Search candidates",
      icon: Search,
      onClick: onSearchCandidates,
      iconWrapperClass:
        "bg-[#eaf5ef]",
      iconClass:
        "text-[#16805c]",
      cardClass:
        "py-[14px]",
    },
    {
      label: "Review applications",
      icon: ListChecks,
      onClick: onReviewApplications,
      iconWrapperClass:
        "bg-[#f8f0e3]",
      iconClass:
        "text-[#a56a00]",
      cardClass:
        "py-[14px]",
    },
  ];

  return (
    <section
      className="
        flex
        flex-col
        gap-[2px]
        rounded-[12px]
        border
        border-[#e5e7eb]
        bg-white
        p-4
        shadow-[0_4px_12px_rgba(19,26,38,0.024)]
      "
    >
      {/* ==========================================
          TITLE
      ========================================== */}

      <span
        className="
          pb-[10px]
          text-[13px]
          font-semibold
          leading-[17px]
          text-[#111827]
        "
        style={{
          fontFamily:
            '"General Sans", sans-serif',
        }}
      >
        Quick actions
      </span>

      {/* ==========================================
          ACTIONS
      ========================================== */}

      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={`
                flex
                flex-col
                items-center
                justify-center
                gap-4
                rounded-[10px]
                border
                border-[#e5e7eb]
                bg-white
                px-2
                text-center
                cursor-pointer
                transition-colors
                hover:bg-[#f8fafc]
                ${action.cardClass}
              `}
            >
              {/* ICON */}

              <span
                className={`
                  grid
                  h-9
                  w-9
                  shrink-0
                  place-items-center
                  rounded-[10px]
                  ${action.iconWrapperClass}
                `}
              >
                <Icon
                  size={16}
                  strokeWidth={2}
                  className={
                    action.iconClass
                  }
                />
              </span>

              {/* LABEL */}

              <span
                className="
                  max-w-[100px]
                  whitespace-normal
                  text-center
                  text-[12px]
                  font-semibold
                  leading-[16px]
                  text-[#111827]
                "
                style={{
                  fontFamily:
                    '"General Sans", sans-serif',
                }}
              >
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}