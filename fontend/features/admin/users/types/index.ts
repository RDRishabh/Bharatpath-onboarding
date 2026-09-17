export type UserSegment =
  | "candidates"
  | "employers"
  | "institutions";

export type UserState =
  | "Active"
  | "Pending"
  | "Suspended"
  | "Inactive";

export interface UserRow {
  id: string;
  name: string;
  initials: string;
  identifier: string;
  meta: string;
  state: UserState;
  joined: string;
}

export interface AdminUsersState {
  segment: UserSegment;
  search: string;

  candidates: UserRow[];
  employers: UserRow[];
  institutions: UserRow[];
}