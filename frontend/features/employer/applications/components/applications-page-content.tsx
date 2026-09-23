"use client";

import { useMemo } from "react";

import {
  ApplicationPipeline,
  ApplicationFilter,
  ApplicationDrawer,
  ApplicationsPipelineSkeleton,
} from "@/features/employer/applications";
import { ErrorState } from "@/components/ui";
import {
  usePageHeader,
  type Breadcrumb,
} from "@/components/layout/header-context";

import { useApplicationsPage } from "../hooks/use-applications-page";

export function ApplicationsPageContent() {
  const {
    applications,
    isLoading,
    isLoadingMore,
    jobFilter,
    jobOptions,
    selectedJobTitle,
    hasNextPage,
    selectedApplication,
    error,

    handleJobFilterChange,
    handleLoadMore,
    handleOpenApplication,
    handleCloseApplication,
    handleMoveStage,
    handleMoveToColumn,
    handleMeetingLinkChange,
    handleConfirmHire,
  } = useApplicationsPage();

  // When a specific job is in focus (a stage number was clicked on the jobs
  // table), show `Jobs > {job} > Applications`, matching the approved design.
  const breadcrumbs = useMemo<Breadcrumb[] | undefined>(() => {
    if (jobFilter === "all" || !selectedJobTitle) {
      return undefined;
    }
    return [
      { label: "Jobs", href: "/employer/jobs" },
      { label: selectedJobTitle },
      { label: "Applications" },
    ];
  }, [jobFilter, selectedJobTitle]);

  usePageHeader(
    "Applications",
    "Track applicants through your hiring pipeline",
    { breadcrumbs },
  );

  return (
    <div
      className="
        flex
        h-full
        min-h-0
        flex-col
        bg-[#f8f9fb]
        p-4
      "
    >
      {/* =====================================================
          FILTER
      ====================================================== */}

      <div
        className="
          shrink-0
          bg-[#f8f9fb]
          pb-4
        "
      >
        <ApplicationFilter
          value={jobFilter}
          total={applications.length}
          options={jobOptions}
          onChange={handleJobFilterChange}
        />

        {error ? (
          <ErrorState
            error={error}
            fallback="Something went wrong with that action. Please try again."
            className="mt-3"
          />
        ) : null}
      </div>

      {/* =====================================================
          PIPELINE
      ====================================================== */}

      <div
        className="
          min-h-0
          flex-1
          overflow-hidden
        "
      >
        {isLoading ? (
          <ApplicationsPipelineSkeleton />
        ) : (
          <ApplicationPipeline
            applications={applications}
            hasNextPage={hasNextPage}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            onApplicationClick={
              handleOpenApplication
            }
            onApplicationDrop={handleMoveToColumn}
          />
        )}
      </div>

      {/* =====================================================
          APPLICATION DRAWER
      ====================================================== */}

      <ApplicationDrawer
        application={selectedApplication}
        onClose={handleCloseApplication}
        onMoveStage={handleMoveStage}
        onMeetingLinkChange={
          handleMeetingLinkChange
        }
        onConfirmHire={handleConfirmHire}
      />
    </div>
  );
}
