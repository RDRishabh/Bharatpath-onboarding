"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Bell } from "lucide-react";

import { useGetNotificationsQuery } from "@/store/api/notification-api";
import { useGetStudentProfileQuery } from "@/store/student";
import { initials } from "@/features/student/formatters";

/*
 * ==========================================================================
 * STUDENT HEADER
 *
 * The full-width top bar, following the project header convention (title +
 * subtitle on the left, actions on the right). Carries the two sidebar toggles:
 * a hamburger that opens the mobile drawer, and a collapse button on desktop.
 * ==========================================================================
 */

interface Section {
  title: string;
  subtitle: string;
}

function sectionFor(pathname: string): Section {
  if (pathname === "/student") {
    return { title: "Home", subtitle: "Your job search at a glance" };
  }
  if (pathname.startsWith("/student/jobs")) {
    return { title: "Jobs", subtitle: "Roles matched to your score" };
  }
  if (pathname.startsWith("/student/board")) {
    return { title: "Board", subtitle: "Where your applications stand" };
  }
  if (pathname.startsWith("/student/score")) {
    return { title: "Your score", subtitle: "How your resume reads to employers" };
  }
  if (pathname.startsWith("/student/profile")) {
    return { title: "Profile", subtitle: "Your account and privacy" };
  }
  if (pathname.startsWith("/student/notifications")) {
    return { title: "Notifications", subtitle: "Updates on your applications" };
  }
  if (pathname.startsWith("/student/privacy")) {
    return { title: "Profile visibility", subtitle: "How your profile is shared" };
  }
  if (pathname.startsWith("/student/attribute")) {
    return { title: "Attribute check", subtitle: "How you like to work" };
  }
  if (pathname.startsWith("/student/interview")) {
    return { title: "Mock interview", subtitle: "Practise before it counts" };
  }
  return { title: "BharatPath", subtitle: "" };
}

export function StudentHeader({
  onOpenDrawer,
}: {
  onOpenDrawer: () => void;
}) {
  const pathname = usePathname();
  const { data: profile } = useGetStudentProfileQuery();
  const { data: notificationPage } = useGetNotificationsQuery(
    { limit: 1 },
    {
      pollingInterval: 30_000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );
  const unread = notificationPage?.unreadCount ?? 0;
  const { title, subtitle } = sectionFor(pathname);

  return (
    <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-[#E7E0D4] bg-white px-3 sm:px-4">
      {/* Mobile: open drawer */}
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open menu"
        className="grid h-9 w-9 place-items-center rounded-lg text-[#0A1931] transition-colors hover:bg-[#F7F4EC] md:hidden"
      >
        <Menu size={20} />
      </button>

      {/* Title */}
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="truncate text-[18px] font-bold leading-6 tracking-[-0.01em] text-[#0A1931]">
          {title}
        </h1>
        {subtitle ? (
          <span className="truncate text-[12px] leading-4 text-[#5F6B80]">
            {subtitle}
          </span>
        ) : null}
      </div>

      {/* Actions */}
      <Link
        href="/student/notifications"
        aria-label="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-full border border-[#E7E0D4] bg-white text-[#0A1931] transition-colors hover:bg-[#F7F4EC]"
      >
        <Bell size={17} />
        {unread > 0 ? (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-[1.5px] border-white bg-[#B23A1E]" />
        ) : null}
      </Link>

      <Link
        href="/student/profile"
        aria-label="Your profile"
        className="grid h-9 w-9 place-items-center rounded-full bg-[#5F4DB2] text-[12px] font-bold text-white"
      >
        {initials(profile?.fullName)}
      </Link>
    </header>
  );
}
