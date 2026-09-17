"use client";

import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import {
  addUser,
  removeUser,
  setActiveTab,
  setInvitingUser,
  setProfile,
  setRequestingSeats,
  setSavingProfile,
} from "@/store/college/settings/college-settings.slice";

import {
  selectCollegeProfile,
  selectCollegeUsers,
  selectInvoices,
  selectIsInvitingUser,
  selectIsRequestingSeats,
  selectIsSavingProfile,
  selectSeatInfo,
  selectSettingsTab,
} from "@/store/college/settings/college-settings.selectors";

import {
  updateCollegeProfile,
} from "../services/college.service";

import {
  inviteCollegeUser,
  removeCollegeUser,
} from "../services/users.service";

import {
  requestMoreSeats,
} from "../services/billing.service";

import {
  CollegeUser,
  SettingsTab,
  UserRole,
} from "../types";

export function useSettings() {
  const dispatch = useAppDispatch();

  const activeTab = useAppSelector(selectSettingsTab);
  const profile = useAppSelector(selectCollegeProfile);
  const users = useAppSelector(selectCollegeUsers);
  const seats = useAppSelector(selectSeatInfo);
  const invoices = useAppSelector(selectInvoices);

  const isSavingProfile = useAppSelector(
    selectIsSavingProfile,
  );

  const isInvitingUser = useAppSelector(
    selectIsInvitingUser,
  );

  const isRequestingSeats = useAppSelector(
    selectIsRequestingSeats,
  );

  const changeTab = useCallback(
    (tab: SettingsTab) => {
      dispatch(setActiveTab(tab));
    },
    [dispatch],
  );

  const saveProfile = useCallback(
    async () => {
      dispatch(setSavingProfile(true));

      try {
        const updatedProfile =
          await updateCollegeProfile(profile);

        dispatch(setProfile(updatedProfile));
      } finally {
        dispatch(setSavingProfile(false));
      }
    },
    [dispatch, profile],
  );

  const inviteUser = useCallback(
    async (
      name: string,
      email: string,
      role: UserRole,
    ) => {
      dispatch(setInvitingUser(true));

      try {
        const user = await inviteCollegeUser({
          name,
          email,
          role,
        });

        dispatch(addUser(user));
      } finally {
        dispatch(setInvitingUser(false));
      }
    },
    [dispatch],
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      await removeCollegeUser(userId);
      dispatch(removeUser(userId));
    },
    [dispatch],
  );

  const requestSeats = useCallback(
    async (count: number) => {
      dispatch(setRequestingSeats(true));

      try {
        await requestMoreSeats(count);
      } finally {
        dispatch(setRequestingSeats(false));
      }
    },
    [dispatch],
  );

  return {
    activeTab,
    profile,
    users,
    seats,
    invoices,

    isSavingProfile,
    isInvitingUser,
    isRequestingSeats,

    changeTab,
    saveProfile,
    inviteUser,
    deleteUser,
    requestSeats,
  };
}