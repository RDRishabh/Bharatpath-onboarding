"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import {
  setUserSearch,
  setUserSegment,
} from "@/store/admin/users/slice";

import {
  selectActiveUsers,
  selectAdminUsers,
} from "@/store/admin/users/selectors";

import type { UserSegment } from "../types";

export function useUsers() {
  const dispatch = useAppDispatch();

  const state = useAppSelector(
    selectAdminUsers,
  );

  const users = useAppSelector(
    selectActiveUsers,
  );

  const setSegment = (
    segment: UserSegment,
  ) => {
    dispatch(setUserSegment(segment));
  };

  const setSearch = (
    search: string,
  ) => {
    dispatch(setUserSearch(search));
  };

  const filteredUsers = users.filter(
    (user) =>
      `${user.name}${user.identifier}${user.meta}`
        .toLowerCase()
        .includes(
          state.search.toLowerCase(),
        ),
  );

  return {
    state,

    segment: state.segment,

    search: state.search,

    users,

    filteredUsers,

    setSegment,

    setSearch,
  };
}