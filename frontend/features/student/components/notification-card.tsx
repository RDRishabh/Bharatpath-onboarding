"use client";

import type { ReactNode } from "react";
import { Eye, MessageCircle, Target, ShieldCheck } from "lucide-react";

import { useAppDispatch } from "@/store/hooks";
import { markNotificationRead } from "@/store/student";
import type {
  NotificationType,
  StudentNotification,
} from "@/features/student/types";

/*
 * ==========================================================================
 * NOTIFICATION CARD
 *
 * The candidate only hears about three things (plus system). Tapping an unread
 * card marks it read — a local Redux toggle, no network.
 * ==========================================================================
 */

const ICONS: Record<NotificationType, ReactNode> = {
  view: <Eye size={20} className="text-[#5E4DB2]" />,
  application: <MessageCircle size={20} className="text-[#0A1931]" />,
  job: <Target size={20} className="text-[#0A1931]" />,
  system: <ShieldCheck size={20} className="text-[#0A1931]" />,
};

export function NotificationCard({
  notification,
}: {
  notification: StudentNotification;
}) {
  const dispatch = useAppDispatch();

  return (
    <button
      type="button"
      onClick={() => dispatch(markNotificationRead(notification.id))}
      className="flex w-full items-start gap-3 rounded-2xl border border-[#E7E0D4] bg-white p-4 text-left transition-colors hover:bg-[#FFFDF9]"
    >
      <span className="mt-0.5 shrink-0">{ICONS[notification.type]}</span>

      <span className="flex flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="text-[14px] font-semibold leading-5 text-[#0A1931]">
            {notification.title}
          </span>
          {!notification.read ? (
            <span
              aria-label="Unread"
              className="h-2 w-2 shrink-0 rounded-full bg-[#B23A1E]"
            />
          ) : null}
        </span>
        <span className="text-[13px] leading-[18px] text-[#5F6B80]">
          {notification.description}
        </span>
        <span className="text-[11px] leading-4 text-[#9AA3B2]">
          {notification.time}
        </span>
      </span>
    </button>
  );
}
