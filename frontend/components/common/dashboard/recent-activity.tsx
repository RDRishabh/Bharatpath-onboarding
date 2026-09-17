import {
  FileText,
  GraduationCap,
  Receipt,
  UserPlus,
} from "lucide-react";

import { RecentActivity } from "../../../features/college/dashboard/types";

interface RecentActivityProps {
  activities: RecentActivity[];
}

const icons = {
  link: UserPlus,
  upload: FileText,
  hire: GraduationCap,
  invoice: Receipt,
};

const toneClasses = {
  link: "bg-[#eef0ff] text-[#4e43b7]",
  upload: "bg-[#f0f1f4] text-[#4f5666]",
  hire: "bg-[#e6f6ec] text-[#1f8a4c]",
  invoice: "bg-[#fdf1e0] text-[#b5650b]",
};

export function RecentActivityList({
  activities,
}: RecentActivityProps) {
  return (
    <div className="rounded-xl border border-[#e5e7ec] bg-white p-5">
      <h2 className="text-sm font-semibold text-[#252b3b]">
        Recent activity
      </h2>

      <div
        className="
          mt-5
          max-h-[320px]
          space-y-5
          overflow-y-auto
          pr-1

          [&::-webkit-scrollbar]:w-[6px]
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-[#c7cbd2]
          [&::-webkit-scrollbar-thumb]:hover:bg-[#b5bac3]
        "
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#c7cbd2 transparent",
        }}
      >
        {activities.map((activity) => {
          const Icon = icons[activity.type];

          return (
            <div
              key={activity.id}
              className="flex gap-3"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneClasses[activity.type]}`}
              >
                <Icon size={16} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm text-[#252b3b]">
                  {activity.text}
                </p>

                <p className="mt-0.5 text-xs text-[#8a91a0]">
                  {activity.time}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}