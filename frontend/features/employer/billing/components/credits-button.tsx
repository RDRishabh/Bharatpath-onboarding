"use client";

import {
  ChevronRight,
  Coins,
} from "lucide-react";

interface CreditsButtonProps {
  credits: number;
  onClick: () => void;
}

export function CreditsButton({
  credits,
  onClick,
}: CreditsButtonProps) {
  const progress = Math.min(
    100,
    Math.max(0, (credits / 10) * 100),
  );

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Buy credits"
      title="Buy credits"
      className="
        flex
        h-[40px]
        w-[184px]
        shrink-0
        cursor-pointer
        items-center
        gap-[10px]
        rounded-xl
        border
        border-[#e5e7ec]
        bg-white
        px-[10px]
        pl-[6px]
        transition-colors
        hover:border-[#cfd3dc]
        hover:bg-[#f7f9fc]
      "
    >
      <span
        className="
          grid
          h-[28px]
          w-[28px]
          shrink-0
          place-items-center
          rounded-[8px]
          bg-[#edf2fa]
        "
      >
        <Coins
          size={14}
          strokeWidth={2.2}
          className="text-[#2c62c4]"
        />
      </span>

      <span
        className="
          flex
          min-w-0
          flex-1
          flex-col
          gap-[3px]
          text-left
        "
      >
        <span
          className="
            whitespace-nowrap
            text-[12px]
            font-[600]
            leading-[16px]
            text-[#131A26]
          "
        >
          {credits} credits left
        </span>

        <span
          className="
            block
            h-[3.5px]
            w-[96px]
            overflow-hidden
            rounded-full
            bg-[#e5e7ec]
          "
        >
          <span
            className="
              block
              h-full
              rounded-full
              bg-[#2c62c4]
            "
            style={{
              width: `${progress}%`,
            }}
          />
        </span>
      </span>

      <ChevronRight
        size={14}
        strokeWidth={2}
        className="shrink-0 text-[#777f90]"
      />
    </button>
  );
}