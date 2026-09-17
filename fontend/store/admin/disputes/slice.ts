import {
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

import type {
  AdminDisputesState,
  Dispute,
  DisputeTab,
} from "@/features/admin/disputes/types";

const initialState: AdminDisputesState = {
  tab: "open",

  openId: null,

  disputes: [
    {
      id: "dispute-001",
      title: "Duplicate employer account",
      parties:
        "Vidarbha Retail LLP · BharatPath",
      status: "Open",
      raised: "Today",
      age: "2h",
      claim:
        "The employer reports that a duplicate account was created for the same organisation and requests that the duplicate profile be merged.",
      evidence: [
        {
          label: "Account registration",
          meta: "Created 02 Sep · Employer account",
        },
        {
          label: "GST verification",
          meta: "GSTIN matched existing account",
        },
      ],
    },

    {
      id: "dispute-002",
      title: "Candidate application dispute",
      parties:
        "Candidate · C331 · Apex Industrial Systems",
      status: "Investigating",
      raised: "Yesterday",
      age: "18h",
      claim:
        "The candidate disputes the status of an application and claims that the employer-side action was not reflected correctly.",
      evidence: [
        {
          label: "Application activity",
          meta: "Activity log available",
        },
        {
          label: "Employer response",
          meta: "Response received 6h ago",
        },
      ],
    },

    {
      id: "dispute-003",
      title: "KYB verification dispute",
      parties:
        "Nashik Pharma Works · BharatPath",
      status: "Pending",
      raised: "03 Sep",
      age: "2d",
      claim:
        "The organisation has requested a review of its KYB verification decision and submitted additional documentation.",
      evidence: [
        {
          label: "Additional address proof",
          meta: "Submitted 03 Sep · PDF",
        },
        {
          label: "KYB submission",
          meta: "Original submission available",
        },
      ],
    },

    {
      id: "dispute-004",
      title: "Duplicate account merged",
      parties:
        "Employer · Sterling Diagnostics Pvt Ltd",
      status: "Resolved",
      raised: "30 Aug",
      age: "5d",
      claim:
        "A duplicate employer account was confirmed and merged after review.",
      evidence: [
        {
          label: "Account comparison",
          meta: "Duplicate organisation confirmed",
        },
        {
          label: "Resolution record",
          meta: "Merged by P. Menon",
        },
      ],
    },

    {
      id: "dispute-005",
      title: "Application access complaint",
      parties:
        "Candidate · C412 · BluePeak Systems",
      status: "Rejected",
      raised: "28 Aug",
      age: "7d",
      claim:
        "The candidate reported an application access issue. Investigation found no platform-side issue.",
      evidence: [
        {
          label: "Access logs",
          meta: "No access failure detected",
        },
        {
          label: "Session history",
          meta: "Normal activity recorded",
        },
      ],
    },
  ],

  auditItems: [
    {
      id: "audit-001",
      description:
        "Approved KYB for Nashik Pharma Works",
      operator: "P. Menon",
      timestamp: "Today 11:04",
      icon: "check",
    },

    {
      id: "audit-002",
      description:
        "Requested additional address proof from Vidarbha Retail LLP",
      operator: "P. Menon",
      timestamp: "Today 09:47",
      icon: "file",
    },

    {
      id: "audit-003",
      description:
        "Escalated integrity flag on Candidate · C218",
      operator: "A. Rao",
      timestamp: "Yesterday 18:22",
      icon: "alert",
    },

    {
      id: "audit-004",
      description:
        "Switched KYB approval mode to Manual",
      operator: "S. Iyer",
      timestamp: "03 Sep 15:10",
      icon: "toggle",
    },

    {
      id: "audit-005",
      description:
        "Resolved dispute · duplicate account merged",
      operator: "P. Menon",
      timestamp: "30 Aug 12:35",
      icon: "gavel",
    },
  ],
};

const adminDisputesSlice = createSlice({
  name: "adminDisputes",

  initialState,

  reducers: {
    setDisputeTab(
      state,
      action: PayloadAction<DisputeTab>,
    ) {
      state.tab = action.payload;
    },

    openDispute(
      state,
      action: PayloadAction<string>,
    ) {
      state.openId = action.payload;
    },

    closeDispute(state) {
      state.openId = null;
    },

    setDisputes(
      state,
      action: PayloadAction<Dispute[]>,
    ) {
      state.disputes = action.payload;
    },
  },
});

export const {
  setDisputeTab,
  openDispute,
  closeDispute,
  setDisputes,
} = adminDisputesSlice.actions;

export default adminDisputesSlice.reducer;