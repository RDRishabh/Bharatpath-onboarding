import type { RootState } from "../../index";

export const selectNotificationUI = (
  state: RootState
) => state.notificationUI;

export const selectNotificationsOpen = (
  state: RootState
) => state.notificationUI.isOpen;