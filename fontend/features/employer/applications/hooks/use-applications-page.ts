"use client";

import { useCallback } from "react";

import {
  useAppDispatch,
  useAppSelector,
} from "@/store/hooks";

import {
  selectFilteredEmployerApplications,
  selectApplicationJobFilter,
  selectOpenApplication,
  setApplicationJobFilter,
  openApplication,
  closeApplication,
  moveApplicationStage,
  setMeetingLink,
  confirmEmployerHire,
} from "@/store/employer/applications";

export function useApplicationsPage() {
  const dispatch = useAppDispatch();

  /*
   * ============================================================
   * APPLICATIONS
   * ============================================================
   */

  const applications = useAppSelector(
    selectFilteredEmployerApplications,
  );

  /*
   * ============================================================
   * JOB FILTER
   * ============================================================
   */

  const jobFilter = useAppSelector(
    selectApplicationJobFilter,
  );

  /*
   * ============================================================
   * CURRENTLY OPEN APPLICATION
   * ============================================================
   *
   * This is used internally by the handlers below.
   */

  const selectedApplication =
    useAppSelector(
      selectOpenApplication,
    );

  /*
   * ============================================================
   * JOB FILTER
   * ============================================================
   */

  const handleJobFilterChange = useCallback(
    (value: string) => {
      dispatch(
        setApplicationJobFilter(value),
      );
    },
    [dispatch],
  );

  /*
   * ============================================================
   * OPEN APPLICATION
   * ============================================================
   */

  const handleOpenApplication = useCallback(
    (id: string) => {
      dispatch(openApplication(id));
    },
    [dispatch],
  );

  /*
   * ============================================================
   * CLOSE APPLICATION
   * ============================================================
   */

  const handleCloseApplication =
    useCallback(() => {
      dispatch(closeApplication());
    }, [dispatch]);

  /*
   * ============================================================
   * MOVE APPLICATION STAGE
   * ============================================================
   */

  const handleMoveStage = useCallback(
    (
      stage: Parameters<
        typeof moveApplicationStage
      >[0]["stage"],
    ) => {
      if (!selectedApplication) {
        return;
      }

      dispatch(
        moveApplicationStage({
          applicationId:
            selectedApplication.id,
          stage,
        }),
      );
    },
    [dispatch, selectedApplication],
  );

  /*
   * ============================================================
   * MEETING LINK
   * ============================================================
   */

  const handleMeetingLinkChange =
    useCallback(
      (meetingLink: string) => {
        if (!selectedApplication) {
          return;
        }

        dispatch(
          setMeetingLink({
            applicationId:
              selectedApplication.id,
            meetingLink,
          }),
        );
      },
      [dispatch, selectedApplication],
    );

  /*
   * ============================================================
   * CONFIRM HIRE
   * ============================================================
   */

  const handleConfirmHire =
    useCallback(() => {
      if (!selectedApplication) {
        return;
      }

      dispatch(
        confirmEmployerHire(
          selectedApplication.id,
        ),
      );
    }, [dispatch, selectedApplication]);

  /*
   * ============================================================
   * RETURN PAGE DATA + HANDLERS
   * ============================================================
   */

  return {
    applications,
    jobFilter,
    selectedApplication,

    handleJobFilterChange,
    handleOpenApplication,
    handleCloseApplication,
    handleMoveStage,
    handleMeetingLinkChange,
    handleConfirmHire,
  };
}