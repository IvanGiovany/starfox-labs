"use client";

import { useEffect, useRef, useState } from "react";
import { addImageFromUrl, imageErrorMessage } from "@/lib/admin/add-image";
import type { BookFields } from "@/lib/admin/items/books";
import type { BookResult, EditionCover } from "@/lib/admin/open-library";

// "Find on Open Library" at the top of the Reading form. Search by title,
// author or ISBN; picking a book fills its details and copies its cover into
// our own storage (media/books/). "Choose a different cover" shows the covers
// of the book's other editions, which are often nicer.
//
// The small thumbnails here load straight from Open Library, inside the admin
// only; the cover a book keeps is always our own copy.

const DEBOUNCE_MS = 400;

/** Where a cover image is, by id ("S" small, "M" medium, "L" large). By id isn't rate-limited. */
function coverUrl(coverId: number, size: "S" | "M" | "L"): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

async function lookup<T>(params: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/admin/reading/open-library?${params}`, { signal, redirect: "manual" });
  if (response.type === "opaqueredirect") throw new Error("Your sign-in has expired. Save your work, then reload to sign in again.");
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok || !data) throw new Error(data?.error ?? "Couldn't reach Open Library. Try again.");
  return data;
}

type CoverState = { tone: "busy" | "ok" | "warning"; text: string } | null;

/** The fields a pick may leave empty (Open Library doesn't always know them). */
type Filled = Partial<Record<"publishedYear" | "pageCount" | "isbn" | "imagePath", string>>;

export function OpenLibraryAutofill({ fields, patch }: { fields: BookFields; patch: (changes: Partial<BookFields>) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [cover, setCover] = useState<CoverState>(null);
  const [chosenCover, setChosenCover] = useState<number | null>(null);
  const [editions, setEditions] = useState<EditionCover[] | null>(null);
  const [editionsLoading, setEditionsLoading] = useState(false);
  const coverAttempt = useRef(0); // only the newest cover choice may set the image
  // What the autofill itself last filled in. Picking another book replaces or clears
  // those values, but never anything Ivan typed or uploaded himself.
  const filled = useRef<Filled>({});

  // Search a moment after typing stops; each new search cancels the last one.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const data = await lookup<{ results: BookResult[] }>(`q=${encodeURIComponent(q)}`, controller.signal);
        setResults(data.results);
      } catch (error) {
        if (!controller.signal.aborted) setSearchError((error as Error).message);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function applyCover(coverId: number) {
    const attempt = ++coverAttempt.current;
    setChosenCover(coverId);
    setCover({ tone: "busy", text: "Copying the cover into our storage…" });
    try {
      const image = await addImageFromUrl(coverUrl(coverId, "L"), "cover", "books");
      if (attempt !== coverAttempt.current) return;
      patch({ imagePath: image.path });
      filled.current.imagePath = image.path;
      setCover({ tone: "ok", text: "Cover added. It's our own copy." });
    } catch (error) {
      if (attempt === coverAttempt.current) setCover({ tone: "warning", text: imageErrorMessage(error) });
    }
  }

  async function showEditions(workKey: string) {
    setEditionsLoading(true);
    try {
      const data = await lookup<{ covers: EditionCover[] }>(`covers=${encodeURIComponent(workKey)}`);
      setEditions(data.covers);
    } catch (error) {
      setCover({ tone: "warning", text: (error as Error).message });
    } finally {
      setEditionsLoading(false);
    }
  }

  function pick(book: BookResult) {
    // A value Open Library doesn't know: clear it if an earlier pick filled it in
    // (it belongs to that other book), keep it if Ivan entered it himself.
    const fill = (key: keyof Filled, value: string | null): string => {
      const next = value ?? (fields[key] === filled.current[key] ? "" : fields[key]);
      filled.current[key] = next;
      return next;
    };
    patch({
      title: book.title,
      author: book.authors.join(", "),
      publishedYear: fill("publishedYear", book.year ? String(book.year) : null),
      pageCount: fill("pageCount", book.pages ? String(book.pages) : null),
      // Only an ISBN search tells us which edition this is.
      isbn: fill("isbn", book.isbn),
      openLibraryKey: book.key,
    });
    setResults(null);
    setQuery("");
    setEditions(null);
    if (book.coverId) {
      void applyCover(book.coverId);
    } else {
      coverAttempt.current++; // a cover still loading for an earlier pick must not land on this book
      setChosenCover(null);
      const ownImage = fields.imagePath !== "" && fields.imagePath !== filled.current.imagePath;
      if (!ownImage) patch({ imagePath: "" }); // an earlier pick's cover belongs to that book
      filled.current.imagePath = "";
      setCover({
        tone: "warning",
        text: ownImage
          ? "Open Library has no cover for this book, so your own image is kept."
          : "Open Library has no cover for this book. Try “Choose a different cover”, or paste an image URL in the Image field below.",
      });
    }
  }

  return (
    <section aria-label="Find on Open Library" className="rounded-xl bg-bg-raised px-4 py-4 text-sm">
      <label className="block">
        <span className="mb-1.5 block font-medium">Find on Open Library</span>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 2) setResults(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} // don't submit the form
          placeholder="Title, author or ISBN"
          className="field"
        />
      </label>
      <p className="mt-1.5 text-fg-muted" role="status">
        {searching ? "Searching…" : searchError ?? (results && results.length === 0 ? "No books found. Try fewer words, or the ISBN." : "Fills in the details and copies the cover.")}
      </p>

      {results && results.length > 0 && (
        <ul className="mt-2 divide-y divide-rule">
          {results.map((book) => (
            <li key={book.key}>
              <button type="button" onClick={() => pick(book)} className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 text-left hover:bg-bg">
                <span className="flex h-12 w-8 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-bg text-[10px] text-fg-muted">
                  {book.coverId ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a search-result thumbnail from Open Library, admin only
                    <img src={coverUrl(book.coverId, "S")} alt="" loading="lazy" className="size-full object-cover" />
                  ) : (
                    "no cover"
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-base text-fg">{book.title}</span>
                  <span className="block truncate text-fg-muted">
                    {[book.authors.join(", "), book.year, book.pages && `${book.pages} pages`].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {cover && (
        <p role={cover.tone === "warning" ? "alert" : "status"} className={`mt-3 ${cover.tone === "warning" ? "text-danger" : "text-fg-muted"}`}>
          {cover.text}
        </p>
      )}

      {fields.openLibraryKey && editions === null && (
        <button type="button" disabled={editionsLoading} onClick={() => showEditions(fields.openLibraryKey)} className="row-action mt-2 -ml-3">
          {editionsLoading ? "Loading other covers…" : "Choose a different cover"}
        </button>
      )}

      {editions && (
        <div className="mt-3">
          <p className="mb-2 text-fg-muted">
            {editions.length === 0 ? "No other editions have a cover on Open Library." : "Covers from other editions. Pick one to use it instead."}
          </p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {editions.map((edition) => (
              <button
                key={edition.coverId}
                type="button"
                aria-pressed={chosenCover === edition.coverId}
                aria-label={`Use this cover${edition.label ? `: ${edition.label}` : ""}`}
                title={edition.label}
                onClick={() => chosenCover !== edition.coverId && applyCover(edition.coverId)}
                className="shrink-0 cursor-pointer rounded-md p-1 ring-accent hover:bg-bg aria-pressed:ring-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- an edition thumbnail from Open Library, admin only */}
                <img src={coverUrl(edition.coverId, "M")} alt="" loading="lazy" className="h-28 w-auto rounded-sm shadow-sm" />
                <span className="mt-1 block max-w-20 truncate text-[11px] text-fg-muted">{edition.label || "Edition"}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
