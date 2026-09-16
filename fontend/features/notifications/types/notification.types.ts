export type NotificationType =
  | "STUDENT_LINKED"
  | "CONSENT_PENDING"
  | "PAYMENT"
  | "ROSTER"
  | "HIRING"
  | "JOB"
  | "SECURITY"
  | "SYSTEM";

export interface Notification {
  id: string;

  type: NotificationType;

  title: string;

  message?: string | null;

  timestamp: string;

  read: boolean;

  href?: string | null;

  metadata?: Record<string, unknown>;
}

export interface NotificationResponse {
  notifications: Notification[];

  unreadCount: number;

  total: number;
}