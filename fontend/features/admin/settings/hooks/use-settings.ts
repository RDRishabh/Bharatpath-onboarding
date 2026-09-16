"use client";

import {
  useAppDispatch,
  useAppSelector,
} from "@/store/hooks";

import {
  selectAdminSettings,
  setKybMode,
  setSettingsTab,
  toggleCheck,
} from "@/store/admin";

import type {
  AutomaticCheckKey,
  KybMode,
  SettingsTab,
} from "../types";

export function useSettings() {
  const dispatch = useAppDispatch();

  const state = useAppSelector(
    selectAdminSettings,
  );

  const setTab = (
    tab: SettingsTab,
  ) => {
    dispatch(setSettingsTab(tab));
  };

  const changeKybMode = (
    mode: KybMode,
  ) => {
    dispatch(setKybMode(mode));
  };

  const changeCheck = (
    check: AutomaticCheckKey,
  ) => {
    dispatch(toggleCheck(check));
  };

  return {
    state,

    setTab,

    setKybMode: changeKybMode,

    toggleCheck: changeCheck,
  };
}