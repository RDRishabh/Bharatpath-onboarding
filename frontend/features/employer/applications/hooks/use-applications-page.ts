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
import { useRevealEmployerCandidatesQuery } from "@/store/employer/candidates";
import type { EmployerJob } from "@/features/employer/jobs/types";
import type { ApplicationColumnDefinition } from "../types";

const EMPTY_JOBS: EmployerJob[] = [];

export function useApplicationsPage() {
  const dispatch = useAppDispatch();
  const { data: jobs = EMPTY_JOBS, isLoading: jobsLoading } =
    useGetEmployerJobsQuery({
      status: "PUBLISHED",
    });
  const [loadApplications, applicationsState] =
    useLazyGetEmployerApplicationsQuery();
  const [loadApplication] =
    useLazyGetEmployerApplicationQuery();
  const [moveApplication, moveState] =
    useMoveEmployerApplicationMutation();
  const [proposeHire, proposeState] =
    useProposeEmployerHireMutation();

  const applications = useAppSelector(
    selectFilteredEmployerApplications,
  );

  // Applications are aggregated across one lazy query per published job, so a
  // still-fetching first load has no rows yet. Show the pipeline skeleton then.
  const isLoading =
    jobsLoading ||
    (jobs.length > 0 &&
      applications.length === 0 &&
      (applicationsState.isUninitialized || applicationsState.isFetching));

  // Masking off: reveal every applicant and show the real name and score.
  const revealIds = useMemo(
    () => Array.from(new Set(applications.map((application) => application.candidate.id))),
    [applications],
  );
  const { data: revealedApplicants } = useRevealEmployerCandidatesQuery(revealIds, {
    skip: revealIds.length === 0,
  });
  const displayedApplications = useMemo(
    () =>
      applications.map((application) => {
        const match = revealedApplicants?.[application.candidate.id];
        if (!match?.full_name) {
          return application;
        }
        const initials = match.full_name
          .split(" ")
          .filter(Boolean)
          .map((word) => word[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        return {
          ...application,
          candidate: {
            ...application.candidate,
            name: match.full_name,
            initials,
            unlocked: true,
            exactScore: match.score,
          },
        };
      }),
    [applications, revealedApplicants],
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
    }).catch(() => undefined);

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
        })
        .catch(() => undefined);
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
        })
        .catch(() => undefined);
    },
    [dispatch, moveApplication, selectedApplication],
  );

  const handleMoveToColumn = useCallback(
    (applicationId: string, column: ApplicationColumnDefinition) => {
      const application = applications.find(
        (item) => item.id === applicationId,
      );

      if (!application || application.stage === 4) {
        return;
      }

      let target: "VIEWED" | "SHORTLISTED" | "INTERVIEW" | "REJECTED" | undefined;

      if (column.outcome === "rejected") {
        target = "REJECTED";
      } else if (column.stage === 1) {
        target = "VIEWED";
      } else if (column.stage === 2) {
        target = "SHORTLISTED";
      } else if (column.stage === 3) {
        target = "INTERVIEW";
      }

      if (!target) {
        return;
      }

      void moveApplication({ applicationId, stage: target })
        .unwrap()
        .then((updatedApplication) => {
          dispatch(replaceApplication(updatedApplication));
        })
        .catch(() => undefined);
    },
    [applications, dispatch, moveApplication],
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
        })
        .catch(() => undefined);
    }, [dispatch, proposeHire, selectedApplication]);

  /*
   * ============================================================
   * RETURN PAGE DATA + HANDLERS
   * ============================================================
   */

  return {
    applications: displayedApplications,
    isLoading,
    jobFilter,
    jobOptions,
    selectedApplication,
    error:
      applicationsState.error ??
      moveState.error ??
      proposeState.error,

    handleJobFilterChange,
    handleOpenApplication,
    handleCloseApplication,
    handleMoveStage,
    handleMoveToColumn,
    handleMeetingLinkChange,
    handleConfirmHire,
  };
}
