"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import {
  signIn as signInAction,
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

    signIn: () => {
      dispatch(
        signInAction({
          name: "Admin Operator",
          role: "Platform Administrator",
        }),
      );
    },

    toggleSidebar: () => {
      dispatch(toggleSidebar());
    },

    toggleNotifications: () => {
      dispatch(toggleNotifications());
    },

  };
}