export type QueueTab =
  | "kyb"
  | "integrity";

export type QueueRisk =
  | "High"
  | "Medium"
  | "Low";

export type QueueItemType =
  | "KYB"
  | "Integrity";

export interface QueueItem {
  id: string;
  name: string;
  initials: string;
  submitted: string;
  secondary: string;
  risk: QueueRisk;
  waiting: string;
  type: QueueItemType;
}