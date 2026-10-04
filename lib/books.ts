import { cacheLife, cacheTag } from "next/cache";
import { mediaUrl } from "./media";
import { compareBooks, READING_STATUSES, type ReadingStatus } from "./reading";
import { supabasePublic } from "./supabase/public";

// Books for the public pages. Cached for an hour and tagged "books" (and
// "posts": a card links to its article only once that's published); saving in
// the admin refreshes both tags, so changes show at once.

export type BookLink = { label: string; href: string };

export type Book = {
  id: string;
  title: string;
  author: string | null;
  readingStatus: ReadingStatus;
  /** Extra badges Ivan added, shown after the status badge. */
  badges: string[];
  note: string | null;
  rating: number | null;
  coverUrl: string | null;
  coverAlt: string;
  cardSize: "small" | "wide";
  /** Where the card goes: Ivan's article about the book, else the book's link. Null: nowhere. */
  href: string | null;
  /** The book's link as a small extra link, when the card already goes to the article. */
  links: BookLink[];
};

type BookRow = {
  id: string;
  title: string;
  author: string | null;
  reading_status: string;
  badges: string[];
  note: string | null;
  rating: number | null;
  url: string | null;
  image_path: string | null;
  image_alt: string | null;
  card_size: string;
  finished_on: string | null;
  created_at: string;
  post: { slug: string; status: string } | null;
};

/** "goodreads.com" for https://www.goodreads.com/…: says where the link goes. */
function siteLabel(url: string): string {
  return URL.canParse(url) ? new URL(url).hostname.replace(/^www\./, "") : "Link";
}

/** Where a book leads: the article if it's published, else the book's link; with both, the link becomes a small one. */
export function bookLinks(row: Pick<BookRow, "url" | "post">): { href: string | null; links: BookLink[] } {
  const article = row.post?.status === "published" ? `/writing/${row.post.slug}` : null;
  if (article) return { href: article, links: row.url ? [{ label: siteLabel(row.url), href: row.url }] : [] };
  return { href: row.url, links: [] };
}

/** How many books have each status, for the shelf card. */
export function shelfCounts(books: Pick<Book, "readingStatus">[]): Record<ReadingStatus, number> {
  const counts = { to_read: 0, reading: 0, read: 0 };
  for (const book of books) counts[book.readingStatus]++;
  return counts;
}

const isReadingStatus = (value: string): value is ReadingStatus => (READING_STATUSES as readonly string[]).includes(value);

/** Published books: reading, then read (newest finished first), then to read. */
export async function getPublishedBooks(): Promise<Book[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("books", "posts");

  const { data, error } = await supabasePublic
    .from("books")
    .select("id, title, author, reading_status, badges, note, rating, url, image_path, image_alt, card_size, finished_on, created_at, post:posts(slug, status)")
    .eq("status", "published")
    .order("id")
    .returns<BookRow[]>();
  if (error) throw new Error(`Failed to load books: ${error.message}`);

  return data
    .map((row) => ({ row, readingStatus: isReadingStatus(row.reading_status) ? row.reading_status : "to_read" }))
    .sort((a, b) =>
      compareBooks(
        { id: a.row.id, readingStatus: a.readingStatus, finishedOn: a.row.finished_on, createdAt: a.row.created_at },
        { id: b.row.id, readingStatus: b.readingStatus, finishedOn: b.row.finished_on, createdAt: b.row.created_at },
      ),
    )
    .map(({ row, readingStatus }) => ({
      id: row.id,
      title: row.title,
      author: row.author,
      readingStatus,
      badges: row.badges,
      note: row.note,
      rating: row.rating,
      coverUrl: row.image_path ? mediaUrl(row.image_path) : null,
      coverAlt: row.image_alt ?? "",
      cardSize: row.card_size === "wide" ? "wide" : "small",
      ...bookLinks(row),
    }));
}
