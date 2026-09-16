"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import {
  closeDispute,
  openDispute,
  setDisputeTab,
} from "@/store/admin/disputes/slice";

import {
  selectAdminDisputes,
  selectAuditItems,
  selectOpenDisputes,
  selectResolvedDisputes,
  selectSelectedDispute,
} from "@/store/admin/disputes/selectors";

import type { DisputeTab } from "../types";

export function useDisputes() {
  const dispatch = useAppDispatch();

  const state = useAppSelector(
    selectAdminDisputes,
  );

  const openDisputes = useAppSelector(
    selectOpenDisputes,
  );

  const resolvedDisputes =
    useAppSelector(
      selectResolvedDisputes,
    );

  const selectedDispute =
    useAppSelector(
      selectSelectedDispute,
    );

  const auditItems = useAppSelector(
    selectAuditItems,
  );

  return {
    state,

    openDisputes,

    resolvedDisputes,

    selectedDispute,

    auditItems,

    openCount: openDisputes.length,

    resolvedCount:
      resolvedDisputes.length,

    setTab: (tab: DisputeTab) => {
      dispatch(setDisputeTab(tab));
    },

    openDispute: (id: string) => {
      dispatch(openDispute(id));
    },

    closeDispute: () => {
      dispatch(closeDispute());
    },
  };
}