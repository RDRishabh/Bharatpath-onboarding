"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { useAppDispatch } from "@/store/hooks";

import {
  toggleNotifications,
} from "@/store/common/slices/notification-slice";

import {
  useGetNotificationsQuery,
} from "@/store/api/notification-api";

import {
  MOCK_NOTIFICATIONS,
} from "../mock-notifications";

const USE_MOCK_NOTIFICATIONS = true;

export function NotificationBell() {
  const dispatch = useAppDispatch();
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setTick((tick) => tick + 1);
    window.addEventListener("bharatpath-notifications-updated", handleUpdate);
    return () => {
      window.removeEventListener(
        "bharatpath-notifications-updated",
        handleUpdate,
      );
    };
  }, []);

  const { data } =
    useGetNotificationsQuery(
      {
        limit: 10,
      },
      {
        pollingInterval: 30_000,
        refetchOnFocus: true,
        refetchOnReconnect: true,
      },
    );

  const unreadCount =
    USE_MOCK_NOTIFICATIONS
      ? MOCK_NOTIFICATIONS.filter(
          (notification) =>
            !notification.read,
        ).length
      : data?.unreadCount ?? 0;

  return (
    <button
      type="button"
      aria-label="Notifications"
      onClick={() =>
        dispatch(toggleNotifications())
      }
      className="
        relative
        flex
        h-[36px]
        w-[36px]
        shrink-0
        items-center
        justify-center
        rounded-[10px]
        border
        border-[#e5e7ec]
        bg-white
        text-[#303747]
        transition-colors
        hover:bg-[#f8f9fb]
      "
    >
      <Bell
        size={16}
        strokeWidth={1.8}
      />

      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="
            absolute
            right-[6px]
            top-[5px]
            h-[7px]
            w-[7px]
            rounded-full
            bg-[#c62828]
          "
        />
      )}
    </button>
  );
}