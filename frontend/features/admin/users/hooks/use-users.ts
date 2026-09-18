"use client";

import { useDeferredValue } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import {
  closeUser,
  openUser,
  setUserSearch,
  setUserSegment,
} from "@/store/admin/users/slice";

import { selectAdminUsers } from "@/store/admin/users/selectors";
import { useGetAdminTenantsQuery } from "@/store/api/admin-api";

import type { UserRow, UserSegment, UserState } from "../types";

export function useUsers() {
  const dispatch = useAppDispatch();

  const state = useAppSelector(
    selectAdminUsers,
  );
  const deferredSearch = useDeferredValue(state.search.trim());
  const tenantType = state.segment === "employers" ? "EMPLOYER" : "COLLEGE";
  const query = useGetAdminTenantsQuery(
    { type: tenantType, q: deferredSearch || undefined, limit: 100 },
    { skip: state.segment === "candidates" },
  );

  const users: UserRow[] = (query.data?.items ?? []).map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    initials: tenant.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
    identifier: tenant.id,
    meta: tenant.type === "EMPLOYER" ? "Employer organisation" : "College institution",
    state: `${tenant.status[0]}${tenant.status.slice(1).toLowerCase()}` as UserState,
    joined: new Date(tenant.created_at).toLocaleDateString(),
  }));

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

  return {
    state,

    segment: state.segment,

    search: state.search,

    users,

    filteredUsers: users,

    selectedId: state.selectedId,

    isLoading: query.isLoading || query.isFetching,

    error: query.error,

    setSegment,

    setSearch,

    openUser: (id: string) => dispatch(openUser(id)),

    closeUser: () => dispatch(closeUser()),
  };
}