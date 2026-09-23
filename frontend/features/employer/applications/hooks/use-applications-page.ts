"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

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
  appendApplications,
  replaceApplication,
  useLazyGetEmployerApplicationsQuery,
  useLazyGetEmployerApplicationQuery,
  useMoveEmployerApplicationMutation,
  useProposeEmployerHireMutation,
} from "@/store/employer/applications";
import {
  useGetEmployerJobsQuery,
  useGetEmployerJobQuery,
} from "@/store/employer/jobs";
import {
  useLazyRevealEmployerCandidatesQuery,
  type RevealedCandidateResponse,
} from "@/store/employer/candidates";
import type { EmployerJob } from "@/features/employer/jobs/types";
import type {
  ApplicationColumnDefinition,
  EmployerApplication,
} from "../types";

const EMPTY_JOBS: EmployerJob[] = [];
const APPLICATIONS_BATCH_SIZE = 10;

interface PagedJob {
  id: string;
  title: string;
}

interface ApplicationPageCursor {
  jobIndex: number;
  cursor?: string;
}

interface ApplicationBatch {
  items: EmployerApplication[];
  nextCursor: ApplicationPageCursor | null;
}

const FIRST_APPLICATION_PAGE: ApplicationPageCursor = { jobIndex: 0 };

export function useApplicationsPage() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get("jobId");
  const { data: jobsPage, isLoading: jobsLoading } =
    useGetEmployerJobsQuery({
      status: "PUBLISHED",
      limit: 100,
    });
  const jobs = jobsPage?.items ?? EMPTY_JOBS;
  const [loadApplications, applicationsState] =
    useLazyGetEmployerApplicationsQuery();
  const [loadApplication] =
    useLazyGetEmployerApplicationQuery();
  const [moveApplication, moveState] =
    useMoveEmployerApplicationMutation();
  const [proposeHire, proposeState] =
    useProposeEmployerHireMutation();
  const [revealApplicants] =
    useLazyRevealEmployerCandidatesQuery();

  const jobFilter = useAppSelector(
    selectApplicationJobFilter,
  );

  // A `?jobId=` arriving from the jobs table (a stage number was clicked)
  // selects that job so only its applications are fetched. Only re-syncs when
  // the URL changes, so a later dropdown change is not overwritten.
  useEffect(() => {
    dispatch(setApplicationJobFilter(jobIdParam ?? "all"));
  }, [jobIdParam, dispatch]);

  const selectedJobId = jobFilter === "all" ? undefined : jobFilter;
  const jobInList = useMemo(
    () => jobs.find((job) => job.id === selectedJobId),
    [jobs, selectedJobId],
  );

  // A clicked job may be paused or closed and so absent from the published
  // list above; fetch it directly to fill the breadcrumb and load its
  // applications. Skipped when it is already in the list or nothing is selected.
  const selectedJobQuery = useGetEmployerJobQuery(selectedJobId ?? "", {
    skip: !selectedJobId || Boolean(jobInList),
  });

  const selectedJobTitle =
    jobInList?.title ?? selectedJobQuery.data?.title ?? null;

  const [nextCursor, setNextCursor] = useState<ApplicationPageCursor | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const requestGenerationRef = useRef(0);
  const revealedApplicantsRef = useRef<
    Record<string, RevealedCandidateResponse>
  >({});
  const [revealedApplicants, setRevealedApplicants] = useState<
    Record<string, RevealedCandidateResponse>
  >({});

  const applications = useAppSelector(
    selectFilteredEmployerApplications,
  );

  const displayedApplications = useMemo(
    () =>
      applications.map((application) => {
        const match = revealedApplicants[application.candidate.id];
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
  // global ordering or total that the API does not provide. A single selected
  // job fetches only that job's applications, even if it is paused or closed.
  const pagedJobs = useMemo<PagedJob[]>(() => {
    if (!selectedJobId) {
      return jobs.map((job) => ({ id: job.id, title: job.title }));
    }
    if (jobInList) {
      return [{ id: jobInList.id, title: jobInList.title }];
    }
    if (selectedJobQuery.data) {
      return [
        {
          id: selectedJobQuery.data.id,
          title: selectedJobQuery.data.title,
        },
      ];
    }
    return [];
  }, [jobs, jobInList, selectedJobId, selectedJobQuery.data]);

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

  const loadApplicationBatch = useCallback(
    async (start: ApplicationPageCursor): Promise<ApplicationBatch> => {
      const items: EmployerApplication[] = [];
      let remaining = APPLICATIONS_BATCH_SIZE;
      let jobIndex = start.jobIndex;
      let cursor = start.cursor;
      let followingCursor: ApplicationPageCursor | null = null;

      while (jobIndex < pagedJobs.length && remaining > 0) {
        const job = pagedJobs[jobIndex];
        const page = await loadApplications({
          jobId: job.id,
          cursor,
          limit: remaining,
        }).unwrap();

        items.push(
          ...page.items.map((application) => ({
            ...application,
            candidate: {
              ...application.candidate,
              jobTitle: job.title,
            },
          })),
        );
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

      return { items, nextCursor: followingCursor };
    },
    [loadApplications, pagedJobs],
  );

  const revealApplicationBatch = useCallback(
    async (
      items: EmployerApplication[],
    ): Promise<Record<string, RevealedCandidateResponse>> => {
      const candidateIds = Array.from(
        new Set(items.map((application) => application.candidate.id)),
      ).filter((candidateId) => !revealedApplicantsRef.current[candidateId]);

      if (candidateIds.length === 0) {
        return {};
      }

      return revealApplicants(candidateIds).unwrap();
    },
    [revealApplicants],
  );

  useEffect(() => {
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    loadingMoreRef.current = false;
    setNextCursor(null);
    setIsLoadingMore(false);
    dispatch(replaceApplications([]));

    if (pagedJobs.length === 0) {
      setIsInitialLoading(false);
      return;
    }

    let active = true;
    setIsInitialLoading(true);

    void (async () => {
      const batch = await loadApplicationBatch(FIRST_APPLICATION_PAGE);
      const revealed = await revealApplicationBatch(batch.items);

      if (active && requestGenerationRef.current === generation) {
        revealedApplicantsRef.current = {
          ...revealedApplicantsRef.current,
          ...revealed,
        };
        setRevealedApplicants((current) => ({
          ...current,
          ...revealed,
        }));
        dispatch(replaceApplications(batch.items));
        setNextCursor(batch.nextCursor);
      }
    })()
      .catch(() => undefined)
      .finally(() => {
        if (active && requestGenerationRef.current === generation) {
          setIsInitialLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    dispatch,
    loadApplicationBatch,
    pagedJobs.length,
    revealApplicationBatch,
  ]);

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || loadingMoreRef.current) {
      return;
    }

    const generation = requestGenerationRef.current;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const batch = await loadApplicationBatch(nextCursor);
      const revealed = await revealApplicationBatch(batch.items);

      if (requestGenerationRef.current !== generation) {
        return;
      }

      revealedApplicantsRef.current = {
        ...revealedApplicantsRef.current,
        ...revealed,
      };
      setRevealedApplicants((current) => ({
        ...current,
        ...revealed,
      }));
      dispatch(appendApplications(batch.items));
      setNextCursor(batch.nextCursor);
    } catch {
      // The RTK Query error is exposed by the hook and rendered by the page.
    } finally {
      if (requestGenerationRef.current === generation) {
        loadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [
    dispatch,
    loadApplicationBatch,
    nextCursor,
    revealApplicationBatch,
  ]);

  const isLoading =
    jobsLoading ||
    isInitialLoading ||
    (jobs.length > 0 &&
      applications.length === 0 &&
      applicationsState.isUninitialized);

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
      if (value === jobFilter) {
        return;
      }
      setIsInitialLoading(true);
      dispatch(
        setApplicationJobFilter(value),
      );
    },
    [dispatch, jobFilter],
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
    isLoadingMore,
    jobFilter,
    jobOptions,
    selectedJobTitle,
    hasNextPage: nextCursor !== null,
    selectedApplication,
    error:
      applicationsState.error ??
      moveState.error ??
      proposeState.error,

    handleJobFilterChange,
    handleLoadMore,
    handleOpenApplication,
    handleCloseApplication,
    handleMoveStage,
    handleMoveToColumn,
    handleMeetingLinkChange,
    handleConfirmHire,
  };
}
