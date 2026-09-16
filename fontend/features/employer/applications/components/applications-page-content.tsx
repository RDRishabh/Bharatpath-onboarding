"use client";

import {
  ApplicationPipeline,
  ApplicationFilter,
  ApplicationDrawer,
} from "@/features/employer/applications";

import { useApplicationsPage } from "../hooks/use-applications-page";

export function ApplicationsPageContent() {
  const {
    applications,
    jobFilter,
    selectedApplication,

    handleJobFilterChange,
    handleOpenApplication,
    handleCloseApplication,
    handleMoveStage,
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
          onChange={handleJobFilterChange}
        />
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
        <ApplicationPipeline
          applications={applications}
          onApplicationClick={
            handleOpenApplication
          }
        />
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