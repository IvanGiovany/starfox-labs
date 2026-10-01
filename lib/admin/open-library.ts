import "server-only";
import { isValidIsbn, normalizeIsbn } from "./items/books";

// Open Library (openlibrary.org), for autofilling books in the admin: search
// by title/author or ISBN, and list the covers of a work's other editions.
// Free, no API key. We identify the site in the User-Agent, as they ask, and
// only ever contact openlibrary.org (the host is fixed here, never taken from
// a request). Covers are later copied into our own storage by the image
// import; nothing public links to Open Library.

const BASE = "https://openlibrary.org";
const USER_AGENT = "StarfoxLabs/1.0 (+https://starfoxlabs.org)";
const TIMEOUT_MS = 8000;

export type BookResult = {
  /** "/works/OL893414W" */
  key: string;
  title: string;
  authors: string[];
  year: number | null;
  pages: number | null;
  /** Open Library cover id, or null when the work has no cover. */
  coverId: number | null;
  /** Set only for ISBN searches: then we know which edition Ivan has. */
  isbn: string | null;
};

export type EditionCover = { coverId: number; label: string };

export class OpenLibraryError extends Error {}

async function getJson(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const name = (error as { name?: string }).name;
    throw new OpenLibraryError(
      name === "TimeoutError" ? "Open Library took too long to answer. Try again." : "Couldn't reach Open Library. Try again.",
    );
  }
  if (!response.ok) throw new OpenLibraryError(`Open Library answered with an error (${response.status}). Try again later.`);
  return response.json();
}

const positive = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.round(n) : null);

/** Up to 8 works matching a title/author, or the one with a given ISBN. */
export async function searchBooks(query: string): Promise<BookResult[]> {
  const q = query.trim().slice(0, 200);
  const isbn = normalizeIsbn(q);
  const byIsbn = isValidIsbn(isbn);
  const params = new URLSearchParams({
    ...(byIsbn ? { isbn } : { q }),
    fields: "key,title,author_name,first_publish_year,number_of_pages_median,cover_i",
    limit: "8",
  });

  const data = (await getJson(`/search.json?${params}`)) as { docs?: Record<string, unknown>[] };
  return (data.docs ?? [])
    .filter((doc) => typeof doc.key === "string" && /^\/works\/OL\d+W$/.test(doc.key) && typeof doc.title === "string")
    .map((doc) => ({
      key: doc.key as string,
      title: doc.title as string,
      authors: Array.isArray(doc.author_name) ? (doc.author_name as unknown[]).filter((a): a is string => typeof a === "string").slice(0, 3) : [],
      year: positive(doc.first_publish_year),
      pages: positive(doc.number_of_pages_median),
      coverId: positive(doc.cover_i),
      isbn: byIsbn ? isbn : null,
    }));
}

type Edition = { covers?: unknown; publishers?: unknown; publish_date?: unknown; languages?: unknown };

/** "Pocket · 2020 · French", from whatever an edition lists. */
function editionLabel(edition: Edition): string {
  const publisher = Array.isArray(edition.publishers) && typeof edition.publishers[0] === "string" ? edition.publishers[0] : "";
  const year = typeof edition.publish_date === "string" ? (edition.publish_date.match(/\d{4}/)?.[0] ?? "") : "";
  const language =
    Array.isArray(edition.languages) && typeof edition.languages[0]?.key === "string"
      ? (LANGUAGES[edition.languages[0].key.replace("/languages/", "")] ?? "")
      : "";
  return [publisher, year, language].filter(Boolean).join(" · ");
}

// The most common languages on Open Library; others are simply left off the label.
const LANGUAGES: Record<string, string> = {
  eng: "English", fre: "French", ger: "German", spa: "Spanish", ita: "Italian", por: "Portuguese",
  rus: "Russian", jpn: "Japanese", chi: "Chinese", dut: "Dutch", pol: "Polish", swe: "Swedish", rum: "Romanian",
};

/**
 * The distinct covers across a work's editions (the first 100 editions; enough
 * to choose from), English editions first. Open Library uses -1 for "no cover".
 */
export async function editionCovers(workKey: string): Promise<EditionCover[]> {
  if (!/^\/works\/OL\d+W$/.test(workKey)) throw new OpenLibraryError("That isn't an Open Library work.");
  const data = (await getJson(`${workKey}/editions.json?limit=100`)) as { entries?: Edition[] };

  const seen = new Set<number>();
  const covers: (EditionCover & { english: boolean })[] = [];
  for (const edition of data.entries ?? []) {
    const english = Array.isArray(edition.languages) && edition.languages.some((l) => l?.key === "/languages/eng");
    for (const id of Array.isArray(edition.covers) ? edition.covers : []) {
      const coverId = positive(id);
      if (coverId && !seen.has(coverId)) {
        seen.add(coverId);
        covers.push({ coverId, label: editionLabel(edition), english });
      }
    }
  }
  // Stable sort: English editions first, otherwise Open Library's order.
  return covers
    .sort((a, b) => Number(b.english) - Number(a.english))
    .slice(0, 48)
    .map(({ coverId, label }) => ({ coverId, label }));
}
