"use client";

import { BellOff } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  markAllNotificationsRead,
  selectNotifications,
  selectUnreadCount,
} from "@/store/student";
import { StudentTopBar, StudentPage } from "@/features/student/shell";
import { NotificationCard, EmptyState } from "@/features/student/components";

/*
 * ==========================================================================
 * NOTIFICATIONS — the three things the candidate hears about. Tapping a card
 * marks it read; "Mark all read" clears the lot. Local Redux only.
 * ==========================================================================
 */

export function NotificationsList() {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);
  const unread = useAppSelector(selectUnreadCount);

  return (
    <StudentPage width="narrow">
      <div className="flex flex-col gap-4">
      <StudentTopBar
        title="Notifications"
        right={
          unread > 0 ? (
            <button
              type="button"
              onClick={() => dispatch(markAllNotificationsRead())}
              className="text-[13px] font-semibold text-[#5F4DB2]"
            >
              Mark all read
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-2">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <NotificationCard key={notification.id} notification={notification} />
          ))
        ) : (
          <EmptyState
            icon={<BellOff size={22} />}
            title="All caught up"
            message="We'll message you when an employer opens your profile or your application moves forward."
          />
        )}
      </div>
      </div>
    </StudentPage>
  );
}
