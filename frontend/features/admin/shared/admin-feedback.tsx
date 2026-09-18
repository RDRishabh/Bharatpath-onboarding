"use client";

import { CheckCircle2, X } from "lucide-react";

import { clearAdminFeedback } from "@/store/admin";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAdminFeedback } from "@/store/admin/feedback/selectors";

export function AdminFeedback() {
  const dispatch = useAppDispatch();
  const message = useAppSelector(selectAdminFeedback);

  if (!message) return null;

  return (
    <div className="fixed bottom-5 right-5 z-100 flex max-w-sm items-center gap-3 rounded-lg border border-[#b9dfc5] bg-[#eef7f1] px-4 py-3 text-[13px] text-[#245f3a] shadow-lg" role="status">
      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 font-semibold">{message}</span>
      <button type="button" onClick={() => dispatch(clearAdminFeedback())} aria-label="Dismiss message" className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#dceee2]">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}