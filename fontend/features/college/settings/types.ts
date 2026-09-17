export type SettingsTab = "profile" | "users" | "billing";

export type UserRole = "Owner" | "Placement lead" | "Viewer";

export interface CollegeProfile {
  legalInstitutionName: string;
  aicteCode: string;
  city: string;
  verified: boolean;
  verifiedOn: string;
}

export interface CollegeUser {
  id: string;
  initials: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface SeatInfo {
  used: number;
  total: number;
  status: "Active" | "Inactive";
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: "Paid" | "Pending" | "Overdue";
}

export interface CollegeSettingsState {
  activeTab: SettingsTab;
  profile: CollegeProfile;
  users: CollegeUser[];
  seats: SeatInfo;
  invoices: Invoice[];
  isSavingProfile: boolean;
  isInvitingUser: boolean;
  isRequestingSeats: boolean;
  error: string | null;
}