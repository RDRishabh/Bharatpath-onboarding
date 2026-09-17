import type { AdminUser, Dispute, QueueItem } from "@/types/admin";

export const kybItems: QueueItem[] = [
  { id: "k1", name: "Sterling Diagnostics Pvt Ltd", initials: "SD", submitted: "Submitted 03 Sep · Pune", secondary: "27ABCDE1234F1Z5", risk: "Medium", waiting: "14h" },
  { id: "k2", name: "Nashik Pharma Works", initials: "NP", submitted: "Submitted 03 Sep · Nashik", secondary: "27PQRST5678K2M1", risk: "Low", waiting: "11h" },
  { id: "k3", name: "Chakan Auto Components", initials: "CA", submitted: "Submitted 04 Sep · Pune", secondary: "27LMNOP9012J3H4", risk: "Low", waiting: "6h" },
  { id: "k4", name: "Vidarbha Retail LLP", initials: "VR", submitted: "Submitted 04 Sep · Nagpur", secondary: "27WXYZA3456B7C8", risk: "High", waiting: "4h" },
  { id: "k5", name: "Bhosari Logistics Pvt Ltd", initials: "BL", submitted: "Submitted 05 Sep · Pune", secondary: "27DEFGH7890L1N2", risk: "Low", waiting: "2h" },
];

export const integrityItems: QueueItem[] = [
  { id: "i1", name: "Candidate · C218", initials: "C2", submitted: "Flagged 03 Sep · automated", secondary: "Duplicate device fingerprint", risk: "High", waiting: "8h" },
  { id: "i2", name: "Candidate · C331", initials: "C3", submitted: "Flagged 04 Sep · automated", secondary: "Score anomaly on retest", risk: "Medium", waiting: "3h" },
  { id: "i3", name: "Employer · Sterling Diagnostics", initials: "SD", submitted: "Flagged 04 Sep · reported", secondary: "Bulk unlock without outreach", risk: "Medium", waiting: "2h" },
  { id: "i4", name: "Candidate · C402", initials: "C4", submitted: "Flagged 05 Sep · automated", secondary: "Mock interview proxy suspected", risk: "High", waiting: "1h" },
  { id: "i5", name: "Candidate · C118", initials: "C1", submitted: "Flagged 05 Sep · reported", secondary: "Mismatched employment history", risk: "Low", waiting: "1h" },
];

export const users: Record<"candidates" | "employers" | "institutions", AdminUser[]> = {
  candidates: [
    { name: "Candidate · C118", initials: "C1", meta: "Pune · Kothrud", identifier: "Score 742 · Building", state: "Active", joined: "12 Jul 2026" },
    { name: "Candidate · C218", initials: "C2", meta: "Nashik", identifier: "Score 861 · Exceptional", state: "Flagged", joined: "02 Aug 2026" },
    { name: "Candidate · C331", initials: "C3", meta: "Pune · Hinjewadi", identifier: "Score 784 · Strong", state: "Under review", joined: "18 Aug 2026" },
    { name: "Candidate · C402", initials: "C4", meta: "Aurangabad", identifier: "Score 706 · Building", state: "Flagged", joined: "24 Aug 2026" },
    { name: "Candidate · C455", initials: "C4", meta: "Nagpur", identifier: "Not scored", state: "Active", joined: "01 Sep 2026" },
  ],
  employers: [
    { name: "Sterling Diagnostics Pvt Ltd", initials: "SD", meta: "Pune · 12 live jobs", identifier: "27ABCDE1234F1Z5", state: "KYB pending", joined: "28 Aug 2026" },
    { name: "Nashik Pharma Works", initials: "NP", meta: "Nashik · 4 live jobs", identifier: "27PQRST5678K2M1", state: "Active", joined: "14 Jul 2026" },
    { name: "Chakan Auto Components", initials: "CA", meta: "Pune · 9 live jobs", identifier: "27LMNOP9012J3H4", state: "Active", joined: "02 Jun 2026" },
    { name: "Vidarbha Retail LLP", initials: "VR", meta: "Nagpur · 2 live jobs", identifier: "27WXYZA3456B7C8", state: "Under review", joined: "30 Aug 2026" },
    { name: "Bhosari Logistics Pvt Ltd", initials: "BL", meta: "Pune · 6 live jobs", identifier: "27DEFGH7890L1N2", state: "Active", joined: "19 May 2026" },
  ],
  institutions: [
    { name: "Sinhgad Institute of Technology", initials: "SI", meta: "Pune · 248 students", identifier: "AICTE 1-4258963", state: "Active", joined: "11 Aug 2026" },
    { name: "Govt. Polytechnic Nashik", initials: "GP", meta: "Nashik · 132 students", identifier: "AICTE 1-7781204", state: "Active", joined: "04 Jul 2026" },
    { name: "Vidarbha College of Engineering", initials: "VC", meta: "Nagpur · 0 students", identifier: "AICTE 1-9930451", state: "Payment pending", joined: "02 Sep 2026" },
  ],
};

export const disputes: Dispute[] = [
  { id: "d1", title: "Unlock charged for an unreachable candidate", parties: "Sterling Diagnostics vs Candidate · C118", status: "Investigating", raised: "03 Sep", age: "2d", claim: "Employer spent 1 credit unlocking C118 and reports the phone number was disconnected on three attempts across two days. Requests a credit refund.", evidence: [{ label: "Call log export", meta: "Uploaded by employer · 3 attempts" }, { label: "Unlock record", meta: "System · 01 Sep 14:22 IST" }, { label: "Candidate last seen", meta: "System · 28 Aug 09:10 IST" }] },
  { id: "d2", title: "Score disputed after mock interview retest", parties: "Candidate · C331 vs BharatPath", status: "Awaiting evidence", raised: "04 Sep", age: "1d", claim: "Candidate states the retest score of 784 does not reflect the completed attribute check and asks for a manual re-evaluation of the recording.", evidence: [{ label: "Retest recording", meta: "12 min · flagged segment 04:20" }, { label: "Score breakdown", meta: "System · 04 Sep" }] },
  { id: "d3", title: "Institution linking code misused", parties: "Govt. Polytechnic Nashik vs 4 accounts", status: "New", raised: "05 Sep", age: "4h", claim: "College reports four accounts linked with its referral code that are not enrolled students. Requests unlinking and a fresh code.", evidence: [{ label: "Linking log", meta: "System · 4 events, same IP block" }] },
  { id: "d4", title: "Duplicate account merged", parties: "Candidate · C402 vs BharatPath", status: "Resolved", raised: "28 Aug", age: "Closed", claim: "Two accounts created with the same Aadhaar last-4. Older account retired, score history migrated.", evidence: [{ label: "Merge record", meta: "Operator P. Menon · 30 Aug" }] },
  { id: "d5", title: "Refund declined — candidate responded", parties: "Chakan Auto Components vs Candidate · C455", status: "Rejected", raised: "22 Aug", age: "Closed", claim: "Employer requested a refund citing no response; candidate produced a reply sent within 24 hours. Credit not refunded.", evidence: [{ label: "Message thread", meta: "Candidate · 23 Aug 11:04 IST" }] },
];

export const auditTrail = [
  ["Approved KYB for Nashik Pharma Works", "P. Menon", "Today 11:04"],
  ["Requested additional address proof from Vidarbha Retail LLP", "P. Menon", "Today 09:47"],
  ["Escalated integrity flag on Candidate · C218", "A. Rao", "Yesterday 18:22"],
  ["Switched KYB approval mode to Manual", "S. Iyer", "03 Sep 15:10"],
  ["Resolved dispute · duplicate account merged", "P. Menon", "30 Aug 12:35"],
];
