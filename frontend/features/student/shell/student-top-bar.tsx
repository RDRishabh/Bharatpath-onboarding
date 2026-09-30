"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { IconCircleButton } from "@/features/student/components";

/*
 * ==========================================================================
 * STUDENT TOP BAR
 *
 * A detail-screen page header: back button + title + optional right slot.
 * Sits at the top of the responsive content column.
 * ==========================================================================
 */

export function StudentTopBar({
  title,
  right,
  onBack,
  backHref,
}: {
  title: ReactNode;
  right?: ReactNode;
  onBack?: () => void;
  backHref?: string;
}) {
  const router = useRouter();

  return (
    <div className="mb-5 flex items-center gap-3">
      <IconCircleButton
        aria-label="Go back"
        onClick={onBack ?? (() => backHref ? router.push(backHref) : router.back())}
      >
        <ArrowLeft size={16} />
      </IconCircleButton>

      <span className="flex-1 truncate text-[18px] font-bold tracking-[-0.02em] text-[#0A1931] sm:text-[20px]">
        {title}
      </span>

      {right}
    </div>
  );
}
