// Dates are formatted in UTC with a fixed locale, so the server and the
// browser always produce the same text (no hydration mismatches).
const dateFormat = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** "Sep 25, 2026" */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** Estimated reading time in minutes, at ~225 words per minute. */
export function readingTime(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 225));
}

/**
 * The local date on this device as "YYYY-MM-DD" (not UTC), e.g. for "finished
 * today". The server runs on UTC, so the browser sends this along.
 */
export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Whether a date sent by a browser could really be "today" somewhere: time
 * zones run from UTC−12 to UTC+14, so it's within a day of the UTC date.
 */
export function isPlausibleToday(date: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const day = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date) return false; // e.g. 2026-02-30
  const utcToday = Date.parse(now.toISOString().slice(0, 10) + "T00:00:00Z");
  return Math.abs(day.getTime() - utcToday) <= 86_400_000;
}

/**
 * Whether a date ("2026-10-04") isn't later than today anywhere on Earth: the
 * furthest-ahead time zone (UTC+14) is at most a day past the UTC date. The
 * server doesn't know the admin's time zone, so this is the check the browser
 * and the server agree on.
 */
export function isNotInFuture(date: string, now = new Date()): boolean {
  const utcToday = Date.parse(now.toISOString().slice(0, 10) + "T00:00:00Z");
  return Date.parse(`${date}T00:00:00Z`) <= utcToday + 86_400_000;
}
