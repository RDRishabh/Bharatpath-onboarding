"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

interface ApplicationPageCursor {
  jobIndex: number;
  cursor?: string;
}

const FIRST_APPLICATION_PAGE: ApplicationPageCursor = { jobIndex: 0 };

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

  const jobFilter = useAppSelector(
    selectApplicationJobFilter,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [cursorHistory, setCursorHistory] = useState<ApplicationPageCursor[]>([
    FIRST_APPLICATION_PAGE,
  ]);
  const [nextCursor, setNextCursor] = useState<ApplicationPageCursor | null>(null);

  const applications = useAppSelector(
    selectFilteredEmployerApplications,
  );

  // Reveal every applicant before rendering the pipeline so placeholder data
  // never flashes during hydration or a full-page refresh.
  const revealIds = useMemo(
    () => Array.from(new Set(applications.map((application) => application.candidate.id))),
    [applications],
  );
  const { data: revealedApplicants, isFetching: applicantsRevealing } =
    useRevealEmployerCandidatesQuery(revealIds, {
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

  // "All jobs" composes the backend's per-job cursors without inventing a
  // global ordering or total that the API does not provide.
  const pagedJobs = useMemo(
    () =>
      jobFilter === "all"
        ? jobs
        : jobs.filter((job) => job.id === jobFilter),
    [jobFilter, jobs],
  );
  const activeCursor = cursorHistory[currentPage - 1] ?? FIRST_APPLICATION_PAGE;

  const isLoading =
    jobsLoading ||
    applicationsState.isFetching ||
    applicantsRevealing ||
    (jobs.length > 0 &&
      applications.length === 0 &&
      applicationsState.isUninitialized);

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

    if (pagedJobs.length === 0) {
      dispatch(replaceApplications([]));
      return () => {
        active = false;
      };
    }

    void (async () => {
      const items = [];
      let remaining = pageSize;
      let jobIndex = activeCursor.jobIndex;
      let cursor = activeCursor.cursor;
      let followingCursor: ApplicationPageCursor | null = null;

      while (jobIndex < pagedJobs.length && remaining > 0) {
        const job = pagedJobs[jobIndex];
        const page = await loadApplications({
          jobId: job.id,
          cursor,
          limit: remaining,
        }).unwrap();

        items.push(...page.items.map((application) => ({
          ...application,
          candidate: {
            ...application.candidate,
            jobTitle: job.title,
          },
        })));
        remaining -= page.items.length;

        if (page.nextCursor) {
          followingCursor = { jobIndex, cursor: page.nextCursor };
          break;
        }

        jobIndex += 1;
        cursor = undefined;
        followingCursor =
          jobIndex < pagedJobs.length ? { jobIndex } : null;
      }

      if (active) {
        dispatch(replaceApplications(items));
        setNextCursor(followingCursor);
      }
    })().catch(() => undefined);

    return () => {
      active = false;
    };
  }, [
    activeCursor.cursor,
    activeCursor.jobIndex,
    dispatch,
    loadApplications,
    pageSize,
    pagedJobs,
  ]);

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

  /*
   * ============================================================
   * CURRENTLY OPEN APPLICATION
   * ============================================================
   *
   * This is used internally by the handlers below.
   */

  const selectedApplicationFromStore = useAppSelector(selectOpenApplication);
  const selectedApplication = useMemo(
    () =>
      displayedApplications.find(
        (application) => application.id === selectedApplicationFromStore?.id,
      ) ?? selectedApplicationFromStore,
    [displayedApplications, selectedApplicationFromStore],
  );

  /*
   * ============================================================
   * JOB FILTER
   * ============================================================
   */

  const handleJobFilterChange = useCallback(
    (value: string) => {
      setCurrentPage(1);
      setCursorHistory([FIRST_APPLICATION_PAGE]);
      setNextCursor(null);
      dispatch(
        setApplicationJobFilter(value),
      );
    },
    [dispatch],
  );

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    setCursorHistory([FIRST_APPLICATION_PAGE]);
    setNextCursor(null);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setNextCursor(null);
    setCurrentPage((page) => Math.max(1, page - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    if (!nextCursor) {
      return;
    }

    setCursorHistory((history) => [
      ...history.slice(0, currentPage),
      nextCursor,
    ]);
    setNextCursor(null);
    setCurrentPage((page) => page + 1);
  }, [currentPage, nextCursor]);

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
    currentPage,
    pageSize,
    hasNextPage: nextCursor !== null,
    selectedApplication,
    error:
      applicationsState.error ??
      moveState.error ??
      proposeState.error,

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
  };
}
