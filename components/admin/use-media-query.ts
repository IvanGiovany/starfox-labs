"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether a CSS media query matches, kept up to date as the window resizes.
 * The server can't know the screen size, so it (and the first render in the
 * browser) assumes `false`.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
