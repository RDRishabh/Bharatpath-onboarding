export type Risk = "Low" | "Medium" | "High";
export type QueueTab = "kyb" | "integrity";
export type UserSegment = "candidates" | "employers" | "institutions";
export type DisputeStatus = "Investigating" | "Awaiting evidence" | "New" | "Resolved" | "Rejected";
export type KybMode = "manual" | "auto";

export interface QueueItem { id: string; name: string; initials: string; submitted: string; secondary: string; risk: Risk; waiting: string; }
export interface VerificationCheck { label: string; detail: string; status: "Passed" | "Attention" | "Not run"; }
export interface AdminUser { name: string; initials: string; meta: string; identifier: string; state: string; joined: string; }
export interface Evidence { label: string; meta: string; }
export interface Dispute { id: string; title: string; parties: string; status: DisputeStatus; raised: string; age: string; claim: string; evidence: Evidence[]; }
export interface Notification { id: string; text: string; time: string; read: boolean; }
