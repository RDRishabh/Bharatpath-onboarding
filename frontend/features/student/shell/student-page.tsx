import type { ReactNode } from "react";

/*
 * ==========================================================================
 * STUDENT PAGE — the responsive content container. Centres and caps the
 * content width, and gives every screen consistent responsive gutters.
 * ==========================================================================
 */

const WIDTHS = {
  narrow: "max-w-3xl",
  medium: "max-w-5xl",
  wide: "max-w-none",
  full: "max-w-none",
} as const;

export function StudentPage({
  children,
  width = "wide",
  className = "",
}: {
  children: ReactNode;
  width?: keyof typeof WIDTHS;
  className?: string;
}) {
  return (
    <div
      className={[
        "mx-auto w-full p-4",
        WIDTHS[width],
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
