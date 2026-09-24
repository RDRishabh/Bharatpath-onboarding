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

import type {
  StudentScoreBand,
  VisibleStudent,
} from "@/store/college/types";

import type { CollegeStudent, ScoreBand } from "../types";

const BAND_MAP: Record<StudentScoreBand, ScoreBand> = {
  ENTRY: "building",
  DEVELOPING: "building",
  SOLID: "strong",
  STRONG: "exceptional",
};

export function mapScoreBand(
  band: StudentScoreBand | null,
): ScoreBand {
  return band ? BAND_MAP[band] : "not_scored";
}

function mapStudent(student: VisibleStudent): CollegeStudent {
  return {
    id: student.candidateId,
    /* Every student in this list is INDIVIDUAL-visible, i.e. linked. */
    name: student.fullName ?? "Unnamed student",
    status: "linked",
    visibleSince: student.visibleSince,
  };
}

/*
 * The single source of truth for the students screen. Everything is served
 * from the backend through RTK Query — the roster, seat usage and the two
 * real ways of reaching students (referral codes and roster CSV imports).
 */
export function useStudents() {
  const studentsQuery = useGetCollegeStudentsQuery({ limit: 100 });
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
    () => (studentsQuery.data?.items ?? []).map(mapStudent),
    [studentsQuery.data],
  );

  return {
    students,
    isLoadingStudents:
      studentsQuery.isLoading || studentsQuery.isFetching,
    studentsError: studentsQuery.isError,

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
