"use client";

import { useMemo } from "react";

import {
  useGetCollegeStudentsQuery,
  useGetReferralCodesQuery,
  useGetRosterImportsQuery,
  useIssueReferralCodeMutation,
  useRevokeReferralCodeMutation,
  useUploadRosterImportMutation,
  useCommitRosterImportMutation,
  useDiscardRosterImportMutation,
  useSendRosterInvitationsMutation,
} from "@/store/college/students/students.api";
import { useGetCollegeSeatsQuery } from "@/store/college/settings/settings.api";
import { useDebouncedSearch } from "@/lib/hooks/use-debounced-value";
import { useCursorPagination } from "@/lib/pagination/use-cursor-pagination";

import type {
  CollegeStudentStageFilter,
  StudentScoreBand,
  VisibleStudent,
} from "@/store/college/types";

import type {
  CollegeStudent,
  ScoreBand,
  StudentStatus,
} from "../types";

const BAND_MAP: Record<StudentScoreBand, ScoreBand> = {
  ENTRY: "building",
  DEVELOPING: "building",
  SOLID: "strong",
  STRONG: "exceptional",
};

const LINK_STATE_MAP: Record<VisibleStudent["linkState"], StudentStatus> = {
  LINKED: "linked",
  INVITED: "invited",
  CONSENT_PENDING: "consent_pending",
};

const STAGE_FILTER_MAP: Record<
  StudentStatus | "all",
  CollegeStudentStageFilter
> = {
  all: "ALL",
  linked: "LINKED",
  invited: "INVITED",
  consent_pending: "CONSENT_PENDING",
};

export function mapScoreBand(
  band: StudentScoreBand | null,
): ScoreBand {
  return band ? BAND_MAP[band] : "not_scored";
}

function mapStudent(student: VisibleStudent): CollegeStudent {
  const id = student.candidateId ?? student.rosterEntryId;
  if (!id) {
    throw new Error("College student list item has no identifier");
  }

  return {
    id:
      student.candidateId === null
        ? `roster:${id}`
        : id,
    candidateId: student.candidateId,
    name: student.fullName ?? "Unnamed student",
    status: LINK_STATE_MAP[student.linkState],
    stageSince: student.stageSince,
    visibleSince: student.visibleSince,
  };
}

/*
 * The single source of truth for the students screen. Everything is served
 * from the backend through RTK Query — the roster, seat usage and the two
 * real ways of reaching students (referral codes and roster CSV imports).
 */
export function useStudents(
  search: string,
  status: StudentStatus | "all",
) {
  const debouncedSearch = useDebouncedSearch(search);
  const stage = STAGE_FILTER_MAP[status];
  const studentsPagination = useCursorPagination(
    [debouncedSearch, stage],
    10,
  );
  const studentsQuery = useGetCollegeStudentsQuery({
    q: debouncedSearch || undefined,
    stage,
    cursor: studentsPagination.cursor,
    limit: studentsPagination.pageSize,
  });
  const seatsQuery = useGetCollegeSeatsQuery();
  const referralCodesQuery = useGetReferralCodesQuery();
  const rosterImportsQuery = useGetRosterImportsQuery();

  const [issueReferralCode, issueState] =
    useIssueReferralCodeMutation();
  const [revokeReferralCode, revokeState] =
    useRevokeReferralCodeMutation();
  const [uploadRosterImport, uploadState] =
    useUploadRosterImportMutation();
  const [commitRosterImport, commitState] =
    useCommitRosterImportMutation();
  const [discardRosterImport, discardState] =
    useDiscardRosterImportMutation();
  const [sendRosterInvitations, sendState] =
    useSendRosterInvitationsMutation();

  const students = useMemo<CollegeStudent[]>(
    () => (studentsQuery.currentData?.items ?? []).map(mapStudent),
    [studentsQuery.currentData],
  );
  const studentsNextCursor =
    studentsQuery.currentData?.nextCursor ?? null;

  return {
    students,
    isLoadingStudents:
      studentsQuery.isLoading || studentsQuery.isFetching,
    studentsError: studentsQuery.isError,
    studentsPagination: {
      currentPage: studentsPagination.currentPage,
      hasNextPage: Boolean(studentsNextCursor),
      goToNextPage: () =>
        studentsPagination.goToNextPage(studentsNextCursor),
      goToPreviousPage: studentsPagination.goToPreviousPage,
    },

    seats: seatsQuery.data ?? null,
    isLoadingSeats:
      seatsQuery.isLoading || seatsQuery.isFetching,

    referralCodes: referralCodesQuery.data ?? [],
    isLoadingReferralCodes:
      referralCodesQuery.isLoading || referralCodesQuery.isFetching,

    rosterImports: rosterImportsQuery.data ?? [],
    isLoadingRosterImports:
      rosterImportsQuery.isLoading || rosterImportsQuery.isFetching,

    issueReferralCode,
    isIssuingCode: issueState.isLoading,
    revokeReferralCode,
    isRevokingCode: revokeState.isLoading,

    uploadRosterImport,
    isUploadingRoster: uploadState.isLoading,
    commitRosterImport,
    isCommittingRoster: commitState.isLoading,
    discardRosterImport,
    isDiscardingRoster: discardState.isLoading,
    sendRosterInvitations,
    isSendingInvitations: sendState.isLoading,
  };
}
