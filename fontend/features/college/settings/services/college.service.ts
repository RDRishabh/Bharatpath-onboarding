import { CollegeProfile } from "../types";

export async function updateCollegeProfile(
  profile: CollegeProfile,
): Promise<CollegeProfile> {
  // Replace this with your API call later.

  await new Promise((resolve) =>
    setTimeout(resolve, 600),
  );

  return profile;
}