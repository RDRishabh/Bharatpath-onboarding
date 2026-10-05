import type { ApplicationStage, EmployerApplication } from "./types";

export function canMoveApplicationStage(
  application: Pick<EmployerApplication, "stage" | "outcome">,
  target: ApplicationStage,
) {
  if (application.outcome !== null) {
    return false;
  }

  // Submitted applications may be shortlisted directly; the API records
  // Viewed first. All other moves must advance exactly one stage.
  return target === application.stage + 1 ||
    (application.stage === 0 && target === 2);
}
