"use client";

import { useState } from "react";

import type {
  ApplicationColumnDefinition,
  EmployerApplication,
} from "../types";

import { ApplicationCard } from "./application-card";

interface ApplicationColumnProps {
  column: ApplicationColumnDefinition;

  applications: EmployerApplication[];
  hasNextPage: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;

  onApplicationClick: (
    id: string,
  ) => void;

  onApplicationDrop: (
    applicationId: string,
    column: ApplicationColumnDefinition,
  ) => void;
}

export function ApplicationColumn({
  column,
  applications,
  hasNextPage,
  isLoadingMore,
  onLoadMore,
  onApplicationClick,
  onApplicationDrop,
}: ApplicationColumnProps) {
  const [isDropTarget, setIsDropTarget] = useState(false);

  const loadNextPageNearEnd = (element: HTMLDivElement) => {
    if (
      hasNextPage &&
      !isLoadingMore &&
      element.scrollHeight - element.scrollTop - element.clientHeight <= 96
    ) {
      onLoadMore();
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDropTarget(false);

    const applicationId = event.dataTransfer.getData("application-id");
    if (applicationId) {
      onApplicationDrop(applicationId, column);
    }
  };

  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDragEnter={() => setIsDropTarget(true)}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setIsDropTarget(false);
        }
      }}
      onDrop={handleDrop}
      className="
        flex
        h-full
        min-h-0
        w-64
        shrink-0
        flex-col
        overflow-hidden
        rounded-[11px]
        border
        border-[#e1e5eb]
        bg-[#f5f7f9]
        transition-colors
      "
      aria-label={`Drop application in ${column.label}`}
      data-drop-target={isDropTarget || undefined}
      style={isDropTarget ? {
        borderColor: "#315f9b",
        backgroundColor: "#eef4fc",
      } : undefined}
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
      <div
        className="bp-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3"
        aria-busy={isLoadingMore}
        onScroll={(event) => loadNextPageNearEnd(event.currentTarget)}
        onWheel={(event) => {
          if (event.deltaY > 0) {
            loadNextPageNearEnd(event.currentTarget);
          }
        }}
      >
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
