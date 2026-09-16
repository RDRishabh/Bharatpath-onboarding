"use client";

import {
  useAppSelector,
} from "@/store/hooks";

import {
  selectNotificationsOpen,
} from "@/store/common/selectors/notification-selectors";

import { NotificationBell } from "./notification-bell";
import { NotificationDropdown } from "./notification-dropdown";

export function NotificationCenter() {
  const isOpen = useAppSelector(
    selectNotificationsOpen,
  );

  return (
    <div className="relative shrink-0">
      <NotificationBell />

      {isOpen && (
        <NotificationDropdown />
      )}
    </div>
  );
}