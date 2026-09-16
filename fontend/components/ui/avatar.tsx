import React from "react";

export interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-[12px]",
  lg: "h-11 w-11 text-[14px]",
};

export function Avatar({ name, size = "md", className = "" }: AvatarProps) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "BP";

  return (
    <div
      className={`grid shrink-0 place-items-center rounded-[8px] bg-[#edf1f8] font-bold text-[#2a3447] select-none ${SIZE_CLASSES[size]} ${className}`}
      style={{ fontFamily: "'General Sans', sans-serif" }}
    >
      {initials}
    </div>
  );
}
