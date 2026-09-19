export type ApplicationStage =
  | 0
  | 1
  | 2
  | 3
  | 4;

export type ApplicationOutcome =
  | "hired"
  | "rejected"
  | null;

export interface ApplicationCandidate {
  id: string;
  name: string;
  initials: string;
  exactScore: number;
  location: string;
  jobTitle: string;
  unlocked: boolean;
}

export interface EmployerApplication {
  id: string;
  jobId: string;
  candidate: ApplicationCandidate;

  stage: ApplicationStage;

  outcome: ApplicationOutcome;

  appliedDate: string;

  meetingLink: string;

  hireEmployerConfirmed?: boolean;
  hireCandidateConfirmed?: boolean;
}

export interface ApplicationColumnDefinition {
  id: string;
  label: string;

  stage: ApplicationStage;

  outcome?: ApplicationOutcome;

  emptyMessage: string;
}