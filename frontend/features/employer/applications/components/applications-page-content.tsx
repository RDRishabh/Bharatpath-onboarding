"use client";

import {
  ApplicationPipeline,
  ApplicationFilter,
  ApplicationDrawer,
  ApplicationsPipelineSkeleton,
} from "@/features/employer/applications";
import { CursorPagination, ErrorState } from "@/components/ui";

import { useApplicationsPage } from "../hooks/use-applications-page";

export function ApplicationsPageContent() {
  const {
    applications,
    isLoading,
    jobFilter,
    jobOptions,
    currentPage,
    pageSize,
    hasNextPage,
    selectedApplication,
    error,

    handleJobFilterChange,
    handlePageSizeChange,
    handlePreviousPage,
    handleNextPage,
    handleOpenApplication,
    handleCloseApplication,
    handleMoveStage,
    handleMoveToColumn,
    handleMeetingLinkChange,
    handleConfirmHire,
  } = useApplicationsPage();

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
            onApplicationClick={
              handleOpenApplication
            }
            onApplicationDrop={handleMoveToColumn}
          />
        )}
      </div>

      <CursorPagination
        currentPage={currentPage}
        itemCount={applications.length}
        pageSize={pageSize}
        hasNextPage={hasNextPage}
        isLoading={isLoading}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        onPageSizeChange={handlePageSizeChange}
        itemLabel={applications.length === 1 ? "application" : "applications"}
        className="mt-3 shrink-0 rounded-[11px] border border-[#e1e5eb]"
      />

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
