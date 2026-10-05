"use client";

import { useLayoutEffect } from "react";

type LockedElement = {
  element: HTMLElement;
  overflow: string;
};

let lockCount = 0;
let bodyOverflow = "";
let htmlOverflow = "";
let lockedElements: LockedElement[] = [];

function lockPageScroll() {
  if (lockCount++ > 0) return;

  bodyOverflow = document.body.style.overflow;
  htmlOverflow = document.documentElement.style.overflow;
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";

  const drawerRoots = Array.from(
    document.querySelectorAll<HTMLElement>("[data-scroll-lock-root]"),
  );

  lockedElements = Array.from(document.body.querySelectorAll<HTMLElement>("*"))
    .filter((element) => {
      if (drawerRoots.some((root) => root.contains(element))) return false;
      const style = window.getComputedStyle(element);
      return /(auto|scroll)/.test(`${style.overflow} ${style.overflowY}`);
    })
    .map((element) => ({ element, overflow: element.style.overflow }));

  for (const { element } of lockedElements) element.style.overflow = "hidden";
}

function unlockPageScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;

  document.body.style.overflow = bodyOverflow;
  document.documentElement.style.overflow = htmlOverflow;
  for (const { element, overflow } of lockedElements) element.style.overflow = overflow;
  lockedElements = [];
}

/** Prevents the page and app-level scroll containers behind an overlay from moving. */
export function useScrollLock(locked: boolean) {
  useLayoutEffect(() => {
    if (!locked) return;
    lockPageScroll();
    return unlockPageScroll;
  }, [locked]);
}
