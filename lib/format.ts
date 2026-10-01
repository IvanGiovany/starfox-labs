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
