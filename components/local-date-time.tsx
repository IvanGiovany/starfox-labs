"use client";

import { useSyncExternalStore } from "react";
import { formatDate } from "@/lib/format";

/** "Nov 7, 2026, 2:05 PM" in the reader's own time zone. Browser only. */
export function localDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const noSubscription = () => () => {};

// A date and time in the reader's time zone. The server doesn't know it, so
// the server's HTML (and hydration) has the plain UTC date; the browser then
// shows its own. useSyncExternalStore does that swap without a mismatch.
export function LocalDateTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    noSubscription,
    () => localDateTime(iso),
    () => formatDate(iso),
  );
  return <time dateTime={iso}>{text}</time>;
}
