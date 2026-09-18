"use client";

import {
  useAppDispatch,
  useAppSelector,
} from "@/store/hooks";

import {
  selectAdminSettings,
  setSettingsTab,
} from "@/store/admin";
import { useGetAdminKybSubmissionsQuery } from "@/store/api/admin-api";

import type {
  SettingsTab,
} from "../types";

export function useSettings() {
  const dispatch = useAppDispatch();

  const state = useAppSelector(
    selectAdminSettings,
  );
  const configQuery = useGetAdminKybSubmissionsQuery({ limit: 1 });

  const setTab = (
    tab: SettingsTab,
  ) => {
    dispatch(setSettingsTab(tab));
  };

  return {
    state: {
      ...state,
      kybMode: configQuery.data?.review_required ? "manual" as const : "auto" as const,
    },

    isLoading: configQuery.isLoading,

    error: configQuery.error,

    setTab,
  };
}