"use client";

import { useCallback, useEffect, useMemo } from "react";

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
  replaceApplications,
  replaceApplication,
  useLazyGetEmployerApplicationsQuery,
  useLazyGetEmployerApplicationQuery,
  useMoveEmployerApplicationMutation,
  useProposeEmployerHireMutation,
} from "@/store/employer/applications";
import { useGetEmployerJobsQuery } from "@/store/employer/jobs";
import type { EmployerJob } from "@/features/employer/jobs/types";

const EMPTY_JOBS: EmployerJob[] = [];

export function useApplicationsPage() {
  const dispatch = useAppDispatch();
  const { data: jobs = EMPTY_JOBS } = useGetEmployerJobsQuery({
    status: "PUBLISHED",
  });
  const [loadApplications] =
    useLazyGetEmployerApplicationsQuery();
  const [loadApplication] =
    useLazyGetEmployerApplicationQuery();
  const [moveApplication] =
    useMoveEmployerApplicationMutation();
  const [proposeHire] =
    useProposeEmployerHireMutation();

  const applications = useAppSelector(
    selectFilteredEmployerApplications,
  );

  const jobOptions = useMemo(
    () => [
      { value: "all", label: "All jobs" },
      ...jobs.map((job) => ({
        value: job.id,
        label: job.title,
      })),
    ],
    [jobs],
  );

  useEffect(() => {
    let active = true;

    if (jobs.length === 0) {
      if (applications.length > 0) {
        dispatch(replaceApplications([]));
      }
      return () => {
        active = false;
      };
    }

    void Promise.all(
      jobs.map(async (job) => {
        const page = await loadApplications({
          jobId: job.id,
          limit: 100,
        }).unwrap();

        return page.items.map((application) => ({
          ...application,
          candidate: {
            ...application.candidate,
            jobTitle: job.title,
          },
        }));
      }),
    ).then((pages) => {
      if (active) {
        dispatch(replaceApplications(pages.flat()));
      }
    });

    return () => {
      active = false;
    };
  }, [applications.length, dispatch, jobs, loadApplications]);

  /*
   * ============================================================
   * APPLICATIONS
   * ============================================================
   */

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
      void loadApplication(id)
        .unwrap()
        .then((application) => {
          dispatch(replaceApplication(application));
        });
    },
    [dispatch, loadApplication],
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

      const apiStage = {
        1: "VIEWED",
        2: "SHORTLISTED",
        3: "INTERVIEW",
        4: "DECISION",
      } as const;
      const target = apiStage[stage as keyof typeof apiStage];

      if (!target) {
        return;
      }

      void moveApplication({
        applicationId: selectedApplication.id,
        stage: target,
      })
        .unwrap()
        .then((application) => {
          dispatch(replaceApplication(application));
        });
    },
    [dispatch, moveApplication, selectedApplication],
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

      void proposeHire(selectedApplication.id)
        .unwrap()
        .then((application) => {
          dispatch(replaceApplication(application));
        });
    }, [dispatch, proposeHire, selectedApplication]);

  /*
   * ============================================================
   * RETURN PAGE DATA + HANDLERS
   * ============================================================
   */

  return {
    applications,
    jobFilter,
    jobOptions,
    selectedApplication,

    handleJobFilterChange,
    handleOpenApplication,
    handleCloseApplication,
    handleMoveStage,
    handleMeetingLinkChange,
    handleConfirmHire,
  };
}