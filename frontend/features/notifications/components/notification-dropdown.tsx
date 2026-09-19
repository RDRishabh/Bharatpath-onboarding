"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BriefcaseBusiness,
  Clock3,
  Link2,
  Receipt,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

import {
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/store/api/notification-api";

import { useAppDispatch } from "@/store/hooks";
import { closeNotifications } from "@/store/common/slices/notification-slice";
import type {
  Notification,
  NotificationType,
} from "../types/notification.types";
import { MOCK_NOTIFICATIONS } from "../mock-notifications";

/*
 * Set this to false when your real
 * notification API is ready.
 */
const USE_MOCK_NOTIFICATIONS = true;

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "STUDENT_LINKED":
      return Link2;

    case "CONSENT_PENDING":
      return Clock3;

    case "PAYMENT":
      return Receipt;

    case "ROSTER":
      return Upload;

    case "HIRING":
    case "JOB":
      return BriefcaseBusiness;

    case "SECURITY":
      return ShieldCheck;

    default:
      return Bell;
  }
}

function getIconStyles(type: NotificationType): {
  background: string;
  color: string;
} {
  switch (type) {
    case "STUDENT_LINKED":
      return { background: "var(--indigo-bg)", color: "var(--indigo)" };

    case "CONSENT_PENDING":
      return { background: "var(--amber-bg)", color: "var(--amber-ink)" };

    case "PAYMENT":
      return { background: "var(--green-bg)", color: "var(--green-ink)" };

    case "ROSTER":
      return { background: "var(--indigo-bg)", color: "var(--indigo)" };

    case "HIRING":
    case "JOB":
      return { background: "var(--green-bg)", color: "var(--green-ink)" };

    case "SECURITY":
      return { background: "#fceeee", color: "#b42318" };

    default:
      return { background: "var(--indigo-bg)", color: "var(--indigo)" };
  }
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const difference = Date.now() - date.getTime();

  const minutes = Math.floor(difference / 60_000);
  if (minutes < 60) {
    return `${Math.max(minutes, 1)}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString();
}

export function NotificationDropdown() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        const bell = (event.target as HTMLElement)?.closest(
          'button[aria-label="Notifications"]',
        );
        if (!bell) {
          dispatch(closeNotifications());
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dispatch]);

  const { data, isLoading, isError } = useGetNotificationsQuery(
    { limit: 10 },
    { skip: USE_MOCK_NOTIFICATIONS },
  );

  const [markNotificationRead] = useMarkNotificationReadMutation();
  const [markAllNotificationsRead, { isLoading: isMarkingAllRead }] =
    useMarkAllNotificationsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  const notifications: Notification[] = USE_MOCK_NOTIFICATIONS
    ? MOCK_NOTIFICATIONS
    : data?.notifications ?? [];

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  const close = () => {
    dispatch(closeNotifications());
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (USE_MOCK_NOTIFICATIONS) {
      notification.read = true;
      window.dispatchEvent(
        new Event("bharatpath-notifications-updated"),
      );

      if (notification.href) {
        close();
        router.push(notification.href);
      }
      return;
    }

    try {
      if (!notification.read) {
        await markNotificationRead(notification.id).unwrap();
      }

      if (notification.href) {
        close();
        router.push(notification.href);
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllRead = async () => {
    if (USE_MOCK_NOTIFICATIONS) {
      MOCK_NOTIFICATIONS.forEach((notification) => {
        notification.read = true;
      });

      window.dispatchEvent(
        new Event("bharatpath-notifications-updated"),
      );
      return;
    }

    try {
      await markAllNotificationsRead().unwrap();
    } catch (error) {
      console.error(
        "Failed to mark all notifications as read:",
        error,
      );
    }
  };

  const handleDelete = async (
    event: React.MouseEvent,
    notificationId: string,
  ) => {
    event.stopPropagation();

    if (USE_MOCK_NOTIFICATIONS) {
      const index = MOCK_NOTIFICATIONS.findIndex(
        (notification) => notification.id === notificationId,
      );

      if (index !== -1) {
        MOCK_NOTIFICATIONS.splice(index, 1);
        window.dispatchEvent(
          new Event("bharatpath-notifications-updated"),
        );
      }
      return;
    }

    try {
      await deleteNotification(notificationId).unwrap();
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        right: 0,
        top: 44,
        width: 320,
        background: "rgb(255, 255, 255)",
        border: "1px solid var(--border-card)",
        borderRadius: 12,
        boxShadow: "rgba(19, 26, 38, 0.28) 0px 12px 28px -14px",
        padding: 8,
        display: "flex",
        flexDirection: "column",
        gap: 0,
        zIndex: 30,
        animation: "0.15s ease 0s 1 normal both running bpFadeUp",
      }}
    >
      {/* HEADER */}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 8px 6px",
        }}
      >
        <span
          style={{
            font: '700 10px / 13px "General Sans", sans-serif',
            letterSpacing: "0.14em",
            color: "var(--ink-muted)",
          }}
        >
          NOTIFICATIONS
        </span>

        {unreadCount > 0 && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleMarkAllRead}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleMarkAllRead();
              }
            }}
            style={{
              font: '600 11px / 14px "General Sans", sans-serif',
              color: "var(--indigo)",
              cursor: isMarkingAllRead ? "default" : "pointer",
              opacity: isMarkingAllRead ? 0.6 : 1,
            }}
          >
            {isMarkingAllRead ? "Marking..." : "Mark all as read"}
          </span>
        )}
      </span>

      {/* BODY */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          maxHeight: 208,
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehavior: "contain",
        }}
        className="bp-scrollbar"
      >
        {isLoading && !USE_MOCK_NOTIFICATIONS && (
          <div style={{ padding: "24px 8px", textAlign: "center" }}>
            <p
              style={{
                font: '400 12px / 16px "General Sans", sans-serif',
                color: "var(--ink-muted)",
              }}
            >
              Loading notifications...
            </p>
          </div>
        )}

        {isError && !USE_MOCK_NOTIFICATIONS && (
          <div style={{ padding: "24px 8px", textAlign: "center" }}>
            <p
              style={{
                font: '500 12px / 16px "General Sans", sans-serif',
                color: "var(--navy)",
              }}
            >
              Unable to load notifications
            </p>
          </div>
        )}

        {!isLoading && !isError && notifications.length === 0 && (
          <div style={{ padding: "24px 8px", textAlign: "center" }}>
            <Bell
              size={20}
              style={{
                margin: "0 auto 6px",
                color: "var(--ink-muted)",
                opacity: 0.5,
              }}
            />
            <p
              style={{
                font: '500 12px / 16px "General Sans", sans-serif',
                color: "var(--navy)",
              }}
            >
              No notifications
            </p>
            <p
              style={{
                font: '400 11px / 14px "General Sans", sans-serif',
                color: "var(--ink-muted)",
                marginTop: 2,
              }}
            >
              You&apos;re all caught up.
            </p>
          </div>
        )}

        {notifications.map((notification, index) => {
          const Icon = getNotificationIcon(notification.type);
          const iconStyles = getIconStyles(notification.type);

          return (
            <div
              key={notification.id}
              className="transition-colors hover:bg-[#f8f9fb]"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 8px",
                borderRadius: 8,
                borderTop:
                  index === 0
                    ? "none"
                    : "1px solid var(--border-hair)",
                cursor: "pointer",
              }}
              onClick={() => handleNotificationClick(notification)}
            >
              {/* ICON */}
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: iconStyles.background,
                  display: "grid",
                  placeItems: "center",
                  flex: "0 0 auto",
                }}
              >
                <Icon
                  size={14}
                  strokeWidth={2.2}
                  style={{ color: iconStyles.color }}
                />
              </span>

              {/* CONTENT */}
              <span
                style={{
                  flex: "1 1 0%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  paddingTop: 2,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    font: '500 12px / 16px "General Sans", sans-serif',
                    color: "var(--navy)",
                    wordBreak: "break-word",
                  }}
                >
                  {notification.title}
                </span>

                <span
                  style={{
                    font: '400 11px / 14px "General Sans", sans-serif',
                    color: "var(--ink-muted)",
                  }}
                >
                  {formatTime(notification.timestamp)}
                </span>
              </span>

              {/* UNREAD DOT */}
              {!notification.read && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--indigo)",
                    flex: "0 0 auto",
                    marginTop: 4,
                  }}
                />
              )}

              {/* CLEAR BUTTON */}
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear notification"
                title="Clear"
                onClick={(event) =>
                  handleDelete(event, notification.id)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();
                    event.stopPropagation();
                    handleDelete(
                      event as unknown as React.MouseEvent,
                      notification.id,
                    );
                  }
                }}
                className="transition-colors hover:bg-[#f2f3f5]"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  flex: "0 0 auto",
                }}
              >
                <X
                  size={12}
                  strokeWidth={2.2}
                  style={{ color: "var(--ink-muted)" }}
                />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}