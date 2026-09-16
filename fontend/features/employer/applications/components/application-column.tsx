"use client";

import type {
  ApplicationColumnDefinition,
  EmployerApplication,
} from "../types";

import { ApplicationCard } from "./application-card";

interface ApplicationColumnProps {
  column: ApplicationColumnDefinition;

  applications: EmployerApplication[];

  onApplicationClick: (
    id: string,
  ) => void;
}

export function ApplicationColumn({
  column,
  applications,
  onApplicationClick,
}: ApplicationColumnProps) {
  return (
    <section
      className="
        flex
        min-h-[calc(100vh-190px)]
        w-[208px]
        shrink-0
        flex-col
        overflow-hidden
        rounded-[11px]
        border
        border-[#e1e5eb]
        bg-[#f5f7f9]
      "
    >
      {/* HEADER */}
      <div className="flex items-center gap-2 px-3 py-3">
        <span
          className="
            text-[11px]
            font-bold
            uppercase
            tracking-[0.06em]
            text-[#687384]
          "
        >
          {column.label}
        </span>

        <span
          className="
            grid
            h-[18px]
            min-w-[18px]
            place-items-center
            rounded-full
            bg-white
            px-1
            text-[10px]
            font-semibold
            text-[#687384]
          "
        >
          {applications.length}
        </span>
      </div>

      {/* BODY */}
      <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
        {applications.length > 0 ? (
          applications.map(
            (application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                onClick={() =>
                  onApplicationClick(
                    application.id,
                  )
                }
              />
            ),
          )
        ) : (
          <div
            className="
              flex
              flex-1
              items-center
              justify-center
              px-4
              text-center
            "
          >
            <p className="text-[11px] leading-4 text-[#9aa2af]">
              {column.emptyMessage}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}