"use client";

import { useEffect, useRef, useState } from "react";

/*
 * ==========================================================================
 * SCORE RING
 *
 * The gold arc + counting number from the score-reveal beat. Never a
 * red-to-green gauge (invariant 6 / design-system §1): a single gold arc that
 * draws once and a number that counts up. Deliberately not a speedometer.
 * ==========================================================================
 */

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const FRACTION_FLOOR = 600;

export function ScoreRing({
  value,
  max,
  size = 190,
  onNavy = true,
  animate = true,
}: {
  value: number;
  max: number;
  size?: number;
  onNavy?: boolean;
  animate?: boolean;
}) {
  const fraction = Math.min(
    1,
    Math.max(0, (value - FRACTION_FLOOR) / (max - FRACTION_FLOOR)),
  );
  const targetOffset = CIRCUMFERENCE * (1 - fraction);

  const [display, setDisplay] = useState(animate ? Math.max(FRACTION_FLOOR, value - 120) : value);
  const [offset, setOffset] = useState(animate ? CIRCUMFERENCE : targetOffset);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      setDisplay(value);
      setOffset(targetOffset);
      return;
    }

    // Draw the arc after a short beat.
    const drawTimer = window.setTimeout(() => setOffset(targetOffset), 120);

    // Count the number up (~40 steps, ease-out).
    let current = Math.max(FRACTION_FLOOR, value - 120);
    const tick = () => {
      current += Math.max(2, Math.round((value - current) / 6));
      if (current >= value) {
        current = value;
        setDisplay(current);
        return;
      }
      setDisplay(current);
      rafRef.current = window.setTimeout(tick, 32) as unknown as number;
    };
    const startTimer = window.setTimeout(tick, 200);

    return () => {
      window.clearTimeout(drawTimer);
      window.clearTimeout(startTimer);
      if (rafRef.current) window.clearTimeout(rafRef.current);
    };
  }, [animate, targetOffset, value]);

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 120 120"
        className="absolute inset-0 h-full w-full"
        style={{ transform: "rotate(-90deg)" }}
      >
        <defs>
          <linearGradient id="scoreArc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFF6DC" />
            <stop offset="52%" stopColor="#F4D685" />
            <stop offset="100%" stopColor="#D4AF37" />
          </linearGradient>
        </defs>
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke={onNavy ? "rgba(255,252,247,0.12)" : "#F0EBDF"}
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke="url(#scoreArc)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.3s cubic-bezier(.22,.85,.2,1)",
          }}
        />
      </svg>
      <span className="relative flex flex-col items-center">
        <span
          className={[
            "text-[42px] font-extrabold leading-[38px] tracking-[-0.05em]",
            onNavy ? "text-white" : "text-[#0A1931]",
          ].join(" ")}
        >
          {display}
        </span>
        <span
          className={[
            "text-[9px] font-semibold uppercase leading-3 tracking-[0.16em]",
            onNavy ? "text-[#9DA9BE]" : "text-[#5F6B80]",
          ].join(" ")}
        >
          out of {max}
        </span>
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Band strip — 4 segments, gold marks your position.
 * ---------------------------------------------------------------------- */
export function BandStrip({
  band,
  count = 4,
  onNavy = true,
}: {
  band: number;
  count?: number;
  onNavy?: boolean;
}) {
  return (
    <span className="grid gap-1" style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}>
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          className="h-[5px] rounded-full"
          style={{
            background:
              index < band
                ? "#F4D685"
                : onNavy
                  ? "rgba(255,252,247,0.16)"
                  : "#F0EBDF",
          }}
        />
      ))}
    </span>
  );
}
