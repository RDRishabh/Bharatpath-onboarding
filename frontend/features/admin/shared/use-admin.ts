"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import {
  selectAdminSidebarCollapsed,
  toggleSidebar,
} from "@/store/admin";
import { toggleNotifications } from "@/store/common/slices/notification-slice";
import { selectNotificationsOpen } from "@/store/common/selectors/notification-selectors";

export function useAdmin() {
  const dispatch = useAppDispatch();

  const sidebarCollapsed = useAppSelector(
    selectAdminSidebarCollapsed,
  );

  const notificationsOpen = useAppSelector(
    selectNotificationsOpen,
  );

  return {
    sidebarCollapsed,
    notificationsOpen,

    toggleSidebar: () => {
      dispatch(toggleSidebar());
    },

    toggleNotifications: () => {
      dispatch(toggleNotifications());
    },

  };
}