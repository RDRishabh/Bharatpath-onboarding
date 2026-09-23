"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { BellOff, LoaderCircle } from "lucide-react";

import {
  useGetNotificationsQuery,
  useLazyGetNotificationsQuery,
  useMarkNotificationReadMutation,
} from "@/store/api/notification-api";
import type { Notification } from "@/features/notifications";
import { StudentTopBar, StudentPage } from "@/features/student/shell";
import { NotificationCard, EmptyState } from "@/features/student/components";

const PAGE_SIZE = 20;

function mergeNotifications(
  current: Notification[],
  incoming: Notification[],
): Notification[] {
  const byId = new Map(current.map((notification) => [notification.id, notification]));
  incoming.forEach((notification) => byId.set(notification.id, notification));
  return Array.from(byId.values()).sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );
}

export function NotificationsList() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const [additionalNotifications, setAdditionalNotifications] = useState<
    Notification[]
  >([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [nextCursorOverride, setNextCursorOverride] = useState<
    string | null | undefined
  >(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const { data, isLoading, isError } = useGetNotificationsQuery({
    limit: PAGE_SIZE,
  });
  const [getNotifications] = useLazyGetNotificationsQuery();
  const [markNotificationRead] = useMarkNotificationReadMutation();

  const mergedNotifications = mergeNotifications(
    data?.notifications ?? [],
    additionalNotifications,
  );
  const notifications = mergedNotifications.map((notification) =>
    readIds.has(notification.id) ? { ...notification, read: true } : notification,
  );
  const nextCursor =
    nextCursorOverride === undefined
      ? data?.nextCursor ?? null
      : nextCursorOverride;
  const unread = Math.max(
    (data?.unreadCount ?? 0) -
      mergedNotifications.filter(
        (notification) => readIds.has(notification.id) && !notification.read,
      ).length,
    0,
  );

  const handleRead = async (notification: Notification) => {
    if (notification.read) return;

    setReadIds((current) => new Set(current).add(notification.id));
    try {
      await markNotificationRead(notification.id).unwrap();
    } catch (error) {
      setReadIds((current) => {
        const updated = new Set(current);
        updated.delete(notification.id);
        return updated;
      });
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllRead = async () => {
    if (isMarkingAllRead) return;
    setIsMarkingAllRead(true);

    try {
      let allNotifications = notifications;
      let cursor = nextCursor;
      while (cursor) {
        const page = await getNotifications({ limit: 100, cursor }).unwrap();
        allNotifications = mergeNotifications(allNotifications, page.notifications);
        cursor = page.nextCursor;
      }

      setAdditionalNotifications(allNotifications);
      setReadIds(new Set(allNotifications.map((notification) => notification.id)));
      setNextCursorOverride(null);
      await Promise.all(
        allNotifications
          .filter((notification) => !notification.read)
          .map((notification) => markNotificationRead(notification.id).unwrap()),
      );
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const page = await getNotifications({ limit: PAGE_SIZE, cursor: nextCursor }).unwrap();
      setAdditionalNotifications((current) =>
        mergeNotifications(current, page.notifications),
      );
      setNextCursorOverride(page.nextCursor);
    } catch (error) {
      console.error("Failed to load more notifications:", error);
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  };

  const loadMoreFromObserver = useEffectEvent(loadMore);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void loadMoreFromObserver();
    }, { rootMargin: "160px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor]);

  return (
    <StudentPage width="narrow">
      <div className="flex flex-col gap-4">
      <StudentTopBar
        title="Notifications"
        right={
          unread > 0 ? (
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={isMarkingAllRead}
              className="text-[13px] font-semibold text-[#5F4DB2]"
            >
              {isMarkingAllRead ? "Marking..." : "Mark all read"}
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-2">
        {isLoading ? (
          [0, 1, 2].map((index) => (
            <div
              key={index}
              aria-hidden="true"
              className="flex items-start gap-3 rounded-2xl border border-[#E7E0D4] bg-white p-4"
            >
              <span className="bp-skeleton h-10 w-10 shrink-0 rounded-xl" />
              <span className="flex flex-1 flex-col gap-2">
                <span className="bp-skeleton h-3 w-2/5 rounded" />
                <span className="bp-skeleton h-3 rounded" />
                <span className="bp-skeleton h-2 w-14 rounded" />
              </span>
            </div>
          ))
        ) : isError ? (
          <EmptyState
            icon={<BellOff size={22} />}
            title="Notifications unavailable"
            message="We couldn't load your updates. Please try again."
          />
        ) : notifications.length > 0 ? (
          notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onRead={(item) => void handleRead(item)}
            />
          ))
        ) : (
          <EmptyState
            icon={<BellOff size={22} />}
            title="All caught up"
            message="We'll message you when an employer opens your profile or your application moves forward."
          />
        )}

        <div ref={sentinelRef} />
        {isLoadingMore ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2 py-4 text-[12px] text-[#5F6B80]"
          >
            <LoaderCircle size={16} className="animate-spin" />
            Loading more
          </div>
        ) : null}
      </div>
      </div>
    </StudentPage>
  );
}
