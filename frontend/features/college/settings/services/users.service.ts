import { CollegeUser, UserRole } from "../types";

export interface InviteUserPayload {
  name: string;
  email: string;
  role: UserRole;
}

export async function inviteCollegeUser(
  payload: InviteUserPayload,
): Promise<CollegeUser> {
  await new Promise((resolve) =>
    setTimeout(resolve, 500),
  );

  const initials = payload.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    id: `user-${Date.now()}`,
    initials,
    name: payload.name,
    email: payload.email,
    role: payload.role,
  };
}

export async function removeCollegeUser(
  userId: string,
): Promise<void> {
  await new Promise((resolve) =>
    setTimeout(resolve, 300),
  );

  console.log("Removing user:", userId);
}