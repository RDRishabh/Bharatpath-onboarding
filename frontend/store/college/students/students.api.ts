import { baseApi } from "@/store/api/base-api";

import type {
  CollegeStudentDetail,
  InvitationsSent,
  ReferralCode,
  RosterImport,
  RosterRow,
  VisibleStudent,
  VisibleStudentsPage,
} from "@/store/college/types";

/* =========================================================
   Students (INDIVIDUAL consent)
========================================================= */

interface VisibleStudentResponse {
  candidate_id: string;
  full_name: string | null;
  visible_since: string;
}

function mapVisibleStudent(
  student: VisibleStudentResponse,
): VisibleStudent {
  return {
    candidateId: student.candidate_id,
    fullName: student.full_name,
    visibleSince: student.visible_since,
  };
}

interface VisibleStudentsPageResponse {
  items: VisibleStudentResponse[];
  next_cursor: string | null;
}

interface StudentHireResponse {
  job_title: string;
  employer_name: string;
  hired_at: string;
  source: "PLATFORM";
}

interface CollegeStudentDetailResponse
  extends VisibleStudentResponse {
  score: number | null;
  band: "ENTRY" | "DEVELOPING" | "SOLID" | "STRONG" | null;
  scored_at: string | null;
  applications: number;
  interviews: number;
  hires: StudentHireResponse[];
}

function mapCollegeStudentDetail(
  student: CollegeStudentDetailResponse,
): CollegeStudentDetail {
  return {
    candidateId: student.candidate_id,
    fullName: student.full_name,
    visibleSince: student.visible_since,
    score: student.score,
    band: student.band,
    scoredAt: student.scored_at,
    applications: student.applications,
    interviews: student.interviews,
    hires: student.hires.map((hire) => ({
      jobTitle: hire.job_title,
      employerName: hire.employer_name,
      hiredAt: hire.hired_at,
      source: hire.source,
    })),
  };
}

/* =========================================================
   Referral codes
========================================================= */

interface ReferralCodeResponse {
  id: string;
  code: string;
  state: ReferralCode["state"];
  uses: number;
  max_uses: number | null;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

function mapReferralCode(
  code: ReferralCodeResponse,
): ReferralCode {
  return {
    id: code.id,
    code: code.code,
    state: code.state,
    uses: code.uses,
    maxUses: code.max_uses,
    expiresAt: code.expires_at,
    revokedAt: code.revoked_at,
    createdAt: code.created_at,
  };
}

/* =========================================================
   Roster imports
========================================================= */

interface InvitationCountsResponse {
  pending: number;
  sent: number;
  accepted: number;
  declined: number;
  expired: number;
}

interface RosterImportResponse {
  id: string;
  file_name: string;
  state: RosterImport["state"];
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  ignored_columns: string[];
  created_at: string;
  committed_at: string | null;
  invitations: InvitationCountsResponse;
}

function mapRosterImport(
  import_: RosterImportResponse,
): RosterImport {
  return {
    id: import_.id,
    fileName: import_.file_name,
    state: import_.state,
    totalRows: import_.total_rows,
    validRows: import_.valid_rows,
    invalidRows: import_.invalid_rows,
    duplicateRows: import_.duplicate_rows,
    ignoredColumns: import_.ignored_columns,
    createdAt: import_.created_at,
    committedAt: import_.committed_at,
    invitations: {
      pending: import_.invitations.pending,
      sent: import_.invitations.sent,
      accepted: import_.invitations.accepted,
      declined: import_.invitations.declined,
      expired: import_.invitations.expired,
    },
  };
}

interface RosterRowResponse {
  row_number: number;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  student_ref: string | null;
  row_state: RosterRow["rowState"];
  issues: string[];
  invite_state: string | null;
}

function mapRosterRow(row: RosterRowResponse): RosterRow {
  return {
    rowNumber: row.row_number,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    studentRef: row.student_ref,
    rowState: row.row_state,
    issues: row.issues,
    inviteState: row.invite_state,
  };
}

interface RosterRowsPageResponse {
  items: RosterRowResponse[];
  next_cursor: string | null;
}

interface InvitationsSentResponse {
  sent: number;
  invitations: InvitationCountsResponse;
}

function mapInvitationsSent(
  response: InvitationsSentResponse,
): InvitationsSent {
  return {
    sent: response.sent,
    invitations: {
      pending: response.invitations.pending,
      sent: response.invitations.sent,
      accepted: response.invitations.accepted,
      declined: response.invitations.declined,
      expired: response.invitations.expired,
    },
  };
}

export const collegeStudentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCollegeStudents: builder.query<
      VisibleStudentsPage,
      { cursor?: string; limit?: number } | void
    >({
      query: (args) => ({
        url: "/college/students",
        method: "GET",
        params: args ?? {},
      }),
      transformResponse: (
        response: VisibleStudentsPageResponse,
      ): VisibleStudentsPage => ({
        items: response.items.map(mapVisibleStudent),
        nextCursor: response.next_cursor,
      }),
      providesTags: [{ type: "Student", id: "LIST" }],
    }),

    getCollegeStudent: builder.query<
      CollegeStudentDetail,
      string
    >({
      query: (candidateId) => ({
        url: `/college/students/${candidateId}`,
        method: "GET",
      }),
      transformResponse: mapCollegeStudentDetail,
      providesTags: (_result, _error, candidateId) => [
        { type: "Student", id: candidateId },
      ],
    }),

    getReferralCodes: builder.query<ReferralCode[], void>({
      query: () => ({
        url: "/college/referral-codes",
        method: "GET",
      }),
      transformResponse: (
        response: ReferralCodeResponse[],
      ) => response.map(mapReferralCode),
      providesTags: [
        { type: "College", id: "REFERRAL_CODES" },
      ],
    }),

    issueReferralCode: builder.mutation<
      ReferralCode,
      { expiresInDays?: number; maxUses?: number | null }
    >({
      query: (payload) => ({
        url: "/college/referral-codes",
        method: "POST",
        body: {
          expires_in_days: payload.expiresInDays ?? 90,
          max_uses: payload.maxUses ?? null,
        },
      }),
      transformResponse: mapReferralCode,
      invalidatesTags: [
        { type: "College", id: "REFERRAL_CODES" },
      ],
    }),

    revokeReferralCode: builder.mutation<
      ReferralCode,
      string
    >({
      query: (codeId) => ({
        url: `/college/referral-codes/${codeId}/revoke`,
        method: "POST",
      }),
      transformResponse: mapReferralCode,
      invalidatesTags: [
        { type: "College", id: "REFERRAL_CODES" },
      ],
    }),

    uploadRosterImport: builder.mutation<
      RosterImport,
      { fileName: string; csv: string }
    >({
      query: (payload) => ({
        url: "/college/roster-imports",
        method: "POST",
        body: {
          file_name: payload.fileName,
          csv: payload.csv,
        },
      }),
      transformResponse: mapRosterImport,
      invalidatesTags: [
        { type: "College", id: "ROSTER_IMPORTS" },
      ],
    }),

    getRosterImports: builder.query<RosterImport[], void>({
      query: () => ({
        url: "/college/roster-imports",
        method: "GET",
      }),
      transformResponse: (
        response: RosterImportResponse[],
      ) => response.map(mapRosterImport),
      providesTags: [
        { type: "College", id: "ROSTER_IMPORTS" },
      ],
    }),

    getRosterImport: builder.query<RosterImport, string>({
      query: (importId) => ({
        url: `/college/roster-imports/${importId}`,
        method: "GET",
      }),
      transformResponse: mapRosterImport,
      providesTags: (_result, _error, importId) => [
        { type: "College", id: `ROSTER_IMPORT_${importId}` },
      ],
    }),

    getRosterImportRows: builder.query<
      RosterRow[],
      { importId: string; rowState?: RosterRow["rowState"] } | null
    >({
      query: (args) => {
        if (!args) {
          return { url: "", method: "GET" };
        }

        return {
          url: `/college/roster-imports/${args.importId}/rows`,
          method: "GET",
          params: {
            ...(args.rowState
              ? { row_state: args.rowState }
              : {}),
          },
        };
      },
      transformResponse: (
        response: RosterRowsPageResponse,
      ) => response.items.map(mapRosterRow),
    }),

    commitRosterImport: builder.mutation<
      RosterImport,
      string
    >({
      query: (importId) => ({
        url: `/college/roster-imports/${importId}/commit`,
        method: "POST",
      }),
      transformResponse: mapRosterImport,
      invalidatesTags: (_result, _error, importId) => [
        { type: "College", id: "ROSTER_IMPORTS" },
        { type: "College", id: `ROSTER_IMPORT_${importId}` },
      ],
    }),

    discardRosterImport: builder.mutation<
      RosterImport,
      string
    >({
      query: (importId) => ({
        url: `/college/roster-imports/${importId}/discard`,
        method: "POST",
      }),
      transformResponse: mapRosterImport,
      invalidatesTags: (_result, _error, importId) => [
        { type: "College", id: "ROSTER_IMPORTS" },
        { type: "College", id: `ROSTER_IMPORT_${importId}` },
      ],
    }),

    sendRosterInvitations: builder.mutation<
      InvitationsSent,
      string
    >({
      query: (importId) => ({
        url: `/college/roster-imports/${importId}/invitations/send`,
        method: "POST",
      }),
      transformResponse: mapInvitationsSent,
      invalidatesTags: (_result, _error, importId) => [
        { type: "College", id: "ROSTER_IMPORTS" },
        { type: "College", id: `ROSTER_IMPORT_${importId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCollegeStudentsQuery,
  useGetCollegeStudentQuery,
  useGetReferralCodesQuery,
  useIssueReferralCodeMutation,
  useRevokeReferralCodeMutation,
  useUploadRosterImportMutation,
  useGetRosterImportsQuery,
  useGetRosterImportQuery,
  useGetRosterImportRowsQuery,
  useCommitRosterImportMutation,
  useDiscardRosterImportMutation,
  useSendRosterInvitationsMutation,
} = collegeStudentsApi;