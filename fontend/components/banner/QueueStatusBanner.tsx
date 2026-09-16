"use client";

import {
  AlertCircle,
  CheckCircle,
  Hourglass,
  X,
} from "lucide-react";

export interface QueueStatusBannerProps {
  variant?: "success" | "warning" | "info" | "pending" | "progress";
  title: string;
  message: string;
  showDismiss?: boolean;
  onDismiss?: () => void;
}

export function QueueStatusBanner({
  variant = "success",
  title,
  message,
  showDismiss = true,
  onDismiss,
}: Readonly<QueueStatusBannerProps>) {
  const styles = {
    success: {
      bg: "bg-[#eef4fc]",
      border: "border-[#c9d7ec]",
      iconBg: "bg-[#dce8f8]",
      icon: "text-[#2864b7]",
    },
    warning: {
      bg: "bg-[#fff0f0]",
      border: "border-[#efcaca]",
      iconBg: "bg-[#fde1e1]",
      icon: "text-[#c52b2b]",
    },
    info: {
      bg: "bg-[#f5f7fa]",
      border: "border-[#dfe4eb]",
      iconBg: "bg-[#e9edf3]",
      icon: "text-[#52627a]",
    },
    pending: {
      bg: "bg-[#fff8e9]",
      border: "border-[#ead9ae]",
      iconBg: "bg-[#f4ead0]",
      icon: "text-[#9a721d]",
    },
    progress: {
      bg: "bg-[#eef4fc]",
      border: "border-[#b9cce9]",
      iconBg: "bg-[#dce8f8]",
      icon: "text-[#2864b7]",
    },
  };

  const style = styles[variant];

  let Icon = CheckCircle;

  if (variant === "warning") {
    Icon = AlertCircle;
  } else if (variant === "pending" || variant === "progress") {
    Icon = Hourglass;
  }

  return (
    <div
      className={`flex w-full shrink-0 items-center gap-4 border-b px-4 py-3 ${style.bg} ${style.border}`}
    >
      <div
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-[10px] ${style.iconBg}`}
      >
        <Icon size={20} className={style.icon} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold leading-4.5 text-[#111827]">
          {title}
        </p>

        <p className="text-[13px] leading-4.5 text-[#52627a]">
          {message}
        </p>
      </div>

      {showDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[#52627a] hover:bg-white/70"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}