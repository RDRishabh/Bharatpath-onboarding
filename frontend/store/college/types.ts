/*
 * College portal domain types.
 *
 * snake_case API payloads are mapped into these camelCase UI shapes at the
 * API layer (`store/college/*.api.ts`). Slices and components read only
 * these types; nothing outside the API layer sees a raw backend field.
 */

/* =========================================================
   Organisation & team
========================================================= */

export type CollegeTeamRole =
  | "COLLEGE_ADMIN"
  | "COLLEGE_STAFF";

export interface CollegeOrganisation {
  tenantId: string;
  name: string;
  institutionType: string | null;
  onboardingSubmittedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface CollegeTeamMember {
  userId: string;
  email: string;
  role: CollegeTeamRole;
  addedAt: string;
}

/*
 * The onboarding form is data-driven: the backend publishes the field list and
 * the client renders it. Field keys stay snake_case because the `form` object
 * is passed through untouched from the API (it is a published definition, not a
 * mapped domain object).
 */
export type OnboardingFieldType =
  | "TEXT"
  | "TEXTAREA"
  | "EMAIL"
  | "PHONE"
  | "NUMBER"
  | "SELECT"
  | "MULTISELECT"
  | "DATE"
  | "FILE"
  | "CHECKBOX";

export interface OnboardingField {
  code: string;
  key: string;
  label: string;
  type: OnboardingFieldType;
  required: boolean;
  pattern: string | null;
  max_length: number | null;
  help_text: string | null;
  options_source: string | null;
  public: boolean;
  verification_note: string | null;
}

export interface OnboardingSection {
  code: string;
  title: string;
  fields: OnboardingField[];
  help_text: string | null;
}

export interface OnboardingFormDefinition {
  code: string;
  version: string;
  sections: OnboardingSection[];
}

export interface OnboardingOption {
  code: string;
  label: string;
}

export interface CollegeOnboarding {
  form: OnboardingFormDefinition;
  options: Record<string, OnboardingOption[]>;
  answers: Record<string, unknown>;
  formVersion: string | null;
  submittedAt: string | null;
}

/* =========================================================
   Seats
========================================================= */

export interface CollegeSeats {
  allocated: number;
  used: number;
  available: number;
  subscriptionActive: boolean;
}

/* =========================================================
   Subscription & billing
========================================================= */

export type SubscriptionState =
  | "NONE"
  | "PENDING"
  | "ACTIVE"
  | "GRACE"
  | "LAPSED"
  | "CANCELLED";

export type PaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "REFUNDED";

export type PlanPeriod =
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMESTER"
  | "SEMI_ANNUAL"
  | "ANNUAL";

export interface CollegePlan {
  code: string;
  audience: "CANDIDATE" | "EMPLOYER" | "COLLEGE";
  period: PlanPeriod;
  months: number;
  priceMinor: number;
  currency: string;
  seatAllowance: number | null;
}

export interface CollegeSubscription {
  state: SubscriptionState;
  hasAccess: boolean;
  planCode: string | null;
  period: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  renewsAutomatically: boolean;
  mandateState: string | null;
}

export interface CheckoutResult {
  paymentId: string;
  status: string;
  amountMinor: number;
  currency: string;
  redirectUrl: string | null;
}

export interface MandateResult {
  state: string;
  maxAmountMinor: number;
  validUntil: string | null;
  authorisationUrl: string;
}

export interface Payment {
  id: string;
  status: PaymentStatus;
  purpose: string;
  itemCode: string;
  amountMinor: number;
  currency: string;
  failureCode: string | null;
  createdAt: string;
  settledAt: string | null;
}

/* =========================================================
   Students by roster link stage
========================================================= */

export type StudentScoreBand =
  | "ENTRY"
  | "DEVELOPING"
  | "SOLID"
  | "STRONG";

export type CollegeStudentLinkState =
  | "LINKED"
  | "INVITED"
  | "CONSENT_PENDING";

export type CollegeStudentStageFilter =
  | "ALL"
  | CollegeStudentLinkState;

export interface VisibleStudent {
  candidateId: string | null;
  rosterEntryId: string | null;
  fullName: string | null;
  stageSince: string;
  visibleSince: string | null;
  linkState: CollegeStudentLinkState;
}

export interface VisibleStudentsPage {
  items: VisibleStudent[];
  nextCursor: string | null;
}

export interface StudentHire {
  jobTitle: string;
  employerName: string;
  hiredAt: string;
  source: "PLATFORM";
}

export interface CollegeStudentDetail {
  candidateId: string;
  fullName: string | null;
  visibleSince: string;
  score: number | null;
  band: StudentScoreBand | null;
  scoredAt: string | null;
  applications: number;
  interviews: number;
  hires: StudentHire[];
}

/* =========================================================
   Referral codes
========================================================= */

export type ReferralCodeState =
  | "ACTIVE"
  | "EXPIRED"
  | "REVOKED"
  | "EXHAUSTED";

export interface ReferralCode {
  id: string;
  code: string;
  state: ReferralCodeState;
  uses: number;
  maxUses: number | null;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface ReferralCodesPage {
  items: ReferralCode[];
  nextCursor: string | null;
}

/* =========================================================
   Roster imports
========================================================= */

export type RosterImportState =
  | "PREVIEW"
  | "COMMITTED"
  | "DISCARDED";

export type RosterRowState =
  | "VALID"
  | "INVALID"
  | "DUPLICATE";

export interface InvitationCounts {
  pending: number;
  sent: number;
  accepted: number;
  declined: number;
  expired: number;
}

export interface RosterImport {
  id: string;
  fileName: string;
  state: RosterImportState;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  ignoredColumns: string[];
  createdAt: string;
  committedAt: string | null;
  invitations: InvitationCounts;
}

export interface RosterImportsPage {
  items: RosterImport[];
  nextCursor: string | null;
  invitationTotals: InvitationCounts;
}

export interface RosterRow {
  rowNumber: number;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  studentRef: string | null;
  rowState: RosterRowState;
  issues: string[];
  inviteState: string | null;
}

export interface RosterRowsPage {
  items: RosterRow[];
  nextCursor: string | null;
}

export interface InvitationsSent {
  sent: number;
  invitations: InvitationCounts;
}

/* =========================================================
   Analytics
========================================================= */

export interface ScoreDistribution {
  entry: number;
  developing: number;
  solid: number;
  strong: number;
}

export interface CohortOverview {
  connectedStudents: number;
  individuallyVisible: number;
  minCohortSize: number;
  belowFloor: boolean;
  scoredStudents: number;
  scoreDistribution: ScoreDistribution;
  medianScore: number;
  applicants: number;
  applications: number;
  interviews: number;
  platformHires: number;
}

export interface MonthHires {
  month: string;
  hires: number | null;
}

export interface LocationHires {
  location: string;
  hires: number;
}

export interface PlacementReport {
  source: "PLATFORM";
  minCohortSize: number;
  belowFloor: boolean;
  totalHires: number | null;
  byMonth: MonthHires[];
  byLocation: LocationHires[];
}