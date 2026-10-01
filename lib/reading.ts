// Reading: what a book's status means and the order books are shown in. Shared
// by the admin list and (in Phase 3) the public Reading page, so both agree.

export const READING_STATUSES = ["to_read", "reading", "read"] as const;
export type ReadingStatus = (typeof READING_STATUSES)[number];

/** The words on a book's badge. */
export const READING_STATUS_LABELS: Record<ReadingStatus, string> = {
  to_read: "TO READ",
  reading: "READING",
  read: "READ",
};

type Sortable = { readingStatus: ReadingStatus; finishedOn: string | null; createdAt: string };

const RANK: Record<ReadingStatus, number> = { reading: 0, read: 1, to_read: 2 };

/**
 * Currently reading first, then read (newest finished first; books without a
 * finish date after those), then to read. Within a group, newest added first.
 * Dates are ISO strings, so comparing them as text compares them in time.
 */
export function compareBooks(a: Sortable, b: Sortable): number {
  if (a.readingStatus !== b.readingStatus) return RANK[a.readingStatus] - RANK[b.readingStatus];
  if (a.readingStatus === "read" && a.finishedOn !== b.finishedOn) {
    if (!a.finishedOn) return 1;
    if (!b.finishedOn) return -1;
    return b.finishedOn.localeCompare(a.finishedOn);
  }
  return b.createdAt.localeCompare(a.createdAt);
}
