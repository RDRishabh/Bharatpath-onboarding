import { baseApi } from "@/store/api/base-api";

import type { CompanyProfile, TeamMember, TeamRole } from "./types";

interface EmployerOrganisationResponse {
  tenant_id: string;
  legal_name: string;
  employer_type: string | null;
  industry: string | null;
  kyb_status: string;
}

export function mapEmployerOrganisation(
  organisation: EmployerOrganisationResponse,
): CompanyProfile {
  return {
    legalName: organisation.legal_name,
    businessType: organisation.employer_type ?? "",
    industry: organisation.industry ?? "",
    kybStatus: organisation.kyb_status,
    // These fields are retained for the existing form, but are not returned
    // by the organisation endpoint.
    gstin: "",
    address: "",
  };
}

type EmployerTeamRole =
  | "EMPLOYER_OWNER"
  | "EMPLOYER_RECRUITER"
  | "EMPLOYER_VIEWER";

interface EmployerTeamMemberResponse {
  user_id: string;
  email: string | null;
  role: EmployerTeamRole;
  added_at: string;
}

const ROLE_LABELS: Record<EmployerTeamRole, TeamRole> = {
  EMPLOYER_OWNER: "Owner",
  EMPLOYER_RECRUITER: "Recruiter",
  EMPLOYER_VIEWER: "View only",
};

function displayName(email: string | null) {
  if (!email) {
    return "Team member";
  }

  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function mapEmployerTeamMember(
  member: EmployerTeamMemberResponse,
): TeamMember {
  return {
    id: member.user_id,
    name: displayName(member.email),
    email: member.email ?? "",
    role: ROLE_LABELS[member.role],
    status: "Active",
    // The API exposes active memberships only. Owners cannot be removed.
    canRemove: member.role !== "EMPLOYER_OWNER",
  };
}

export const employerSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEmployerTeam: builder.query<TeamMember[], void>({
      query: () => ({
        url: "/employer/team",
        method: "GET",
      }),
      transformResponse: (response: EmployerTeamMemberResponse[]) =>
        response.map(mapEmployerTeamMember),
      providesTags: [{ type: "Team", id: "LIST" }],
    }),

    getEmployerOrganisation: builder.query<CompanyProfile, void>({
      query: () => ({
        url: "/employer/organisation",
        method: "GET",
      }),
      transformResponse: (response: EmployerOrganisationResponse) =>
        mapEmployerOrganisation(response),
    }),

    updateEmployerOrganisation: builder.mutation<
      CompanyProfile,
      Pick<CompanyProfile, "legalName" | "businessType" | "industry">
    >({
      query: (company) => ({
        url: "/employer/organisation",
        method: "PATCH",
        body: {
          legal_name: company.legalName,
          employer_type: company.businessType || null,
          industry: company.industry || null,
        },
      }),
      transformResponse: (response: EmployerOrganisationResponse) =>
        mapEmployerOrganisation(response),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetEmployerTeamQuery,
  useGetEmployerOrganisationQuery,
  useUpdateEmployerOrganisationMutation,
} = employerSettingsApi;
