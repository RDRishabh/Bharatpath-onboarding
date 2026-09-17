export interface DashboardStats {
  studentsLinked: number;
  consentShared: number;
  averageScore: number;
  hiredViaPlatform: number;
}

export interface ScoreBand {
  label: string;
  range: string;
  count: number;
}

export interface RecentActivity {
  id: string;
  text: string;
  time: string;
  type:
    | "link"
    | "upload"
    | "hire"
    | "invoice";
}

export interface SeatUsage {
  used: number;
  total: number;
}

export type PaymentStatus =
  | "pending"
  | "active"
  | "full";

export interface CollegeDashboard {
  stats: DashboardStats;
  scoreBands: ScoreBand[];
  referralCode: string;
  seats: SeatUsage;
  recentActivity: RecentActivity[];
  paymentStatus: PaymentStatus;
}