import { z } from "zod";
import type { Tables, TablesInsert } from "@/lib/database.types";
import { READING_STATUSES, type ReadingStatus } from "@/lib/reading";
import {
  baseFromRow,
  baseItemShape,
  baseToRow,
  EMPTY_BASE_ITEM,
  optionalDate,
  optionalLink,
  optionalText,
  type BaseItemFields,
  type ItemDefinition,
} from "./item-form";
import { ITEM_SECTIONS } from "./sections";

// Reading: what one book holds, its rules, and how it maps to the `books`
// table. A book needs only a title, even to publish; its reading status
// (to read / reading / read) is separate from draft / published.

const section = ITEM_SECTIONS.reading;

/** "978-0-441-17271-9" → "9780441172719"; a trailing "x" becomes "X". */
export function normalizeIsbn(text: string): string {
  return text.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Checks an ISBN's built-in check digit, which catches most typos.
 * ISBN-10: digits weighted 10…1 (an X counts as 10, last place only) sum to a multiple of 11.
 * ISBN-13: digits weighted 1, 3, 1, 3… sum to a multiple of 10.
 */
export function isValidIsbn(isbn: string): boolean {
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const sum = [...isbn].reduce((total, ch, i) => total + (ch === "X" ? 10 : Number(ch)) * (10 - i), 0);
    return sum % 11 === 0;
  }
  if (/^\d{13}$/.test(isbn)) {
    const sum = [...isbn].reduce((total, ch, i) => total + Number(ch) * (i % 2 === 0 ? 1 : 3), 0);
    return sum % 10 === 0;
  }
  return false;
}

/** A whole number typed into a number field, kept as text so the field can be empty. */
const wholeNumberText = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) >= min && Number(value) <= max), message);

export const bookSchema = z
  .object({
    ...baseItemShape(section),
    author: optionalText(200),
    readingStatus: z.enum(READING_STATUSES),
    startedOn: optionalDate,
    finishedOn: optionalDate,
    rating: z.number().int().min(1, "Rate from 1 to 5 stars.").max(5, "Rate from 1 to 5 stars.").nullable(),
    note: optionalText(500),
    url: optionalLink,
    isbn: z
      .string()
      .transform(normalizeIsbn)
      .refine((isbn) => isbn === "" || /^(\d{9}[\dX]|\d{13})$/.test(isbn), "An ISBN has 10 or 13 digits (the last may be an X).")
      .refine((isbn) => isbn === "" || isValidIsbn(isbn), "That ISBN doesn't add up. A digit may be mistyped."),
    openLibraryKey: z.string().refine((key) => key === "" || /^\/works\/OL\d+W$/.test(key), "That isn't an Open Library work."),
    publishedYear: wholeNumberText(0, 2100, "Use a year between 0 and 2100."),
    pageCount: wholeNumberText(1, 100_000, "The page count has to be a whole number above zero."),
  })
  // Same rule as the database's books_finished_after_started.
  .refine((book) => !book.startedOn || !book.finishedOn || book.finishedOn >= book.startedOn, {
    path: ["finishedOn"],
    message: "The finish date can't be before the start date.",
  });

export type BookFields = BaseItemFields & {
  author: string;
  readingStatus: ReadingStatus;
  startedOn: string;
  finishedOn: string;
  rating: number | null;
  note: string;
  url: string;
  isbn: string;
  openLibraryKey: string;
  publishedYear: string;
  pageCount: string;
};

export const EMPTY_BOOK: BookFields = {
  ...EMPTY_BASE_ITEM,
  author: "",
  readingStatus: "to_read",
  startedOn: "",
  finishedOn: "",
  rating: null,
  note: "",
  url: "",
  isbn: "",
  openLibraryKey: "",
  publishedYear: "",
  pageCount: "",
};

/**
 * Changing the reading status fills in the obvious date, never overwriting
 * one: starting a book sets "started on" to today, finishing it sets
 * "finished on". `today` is the admin's local date ("2026-10-01"), not the
 * server's, so a book finished late at night isn't dated tomorrow.
 */
export function withReadingStatus<T extends { readingStatus: ReadingStatus; startedOn: string; finishedOn: string }>(
  book: T,
  status: ReadingStatus,
  today: string,
): T {
  return {
    ...book,
    readingStatus: status,
    startedOn: status !== "to_read" && !book.startedOn ? today : book.startedOn,
    finishedOn: status === "read" && !book.finishedOn ? today : book.finishedOn,
  };
}

export function bookToRow(data: z.output<typeof bookSchema>): Omit<TablesInsert<"books">, "status"> {
  return {
    ...baseToRow(data),
    author: data.author || null,
    reading_status: data.readingStatus,
    started_on: data.startedOn || null,
    finished_on: data.finishedOn || null,
    rating: data.rating,
    note: data.note || null,
    url: data.url || null,
    isbn: data.isbn || null,
    open_library_key: data.openLibraryKey || null,
    published_year: data.publishedYear === "" ? null : Number(data.publishedYear),
    page_count: data.pageCount === "" ? null : Number(data.pageCount),
  };
}

export function bookFromRow(row: Tables<"books">): BookFields {
  const status = (READING_STATUSES as readonly string[]).includes(row.reading_status) ? (row.reading_status as ReadingStatus) : "to_read";
  return {
    ...baseFromRow(row),
    author: row.author ?? "",
    readingStatus: status,
    startedOn: row.started_on ?? "",
    finishedOn: row.finished_on ?? "",
    rating: row.rating,
    note: row.note ?? "",
    url: row.url ?? "",
    isbn: row.isbn ?? "",
    openLibraryKey: row.open_library_key ?? "",
    publishedYear: row.published_year === null ? "" : String(row.published_year),
    pageCount: row.page_count === null ? "" : String(row.page_count),
  };
}

export const bookDefinition: ItemDefinition<BookFields, z.output<typeof bookSchema>> = {
  section,
  schema: bookSchema,
  toRow: bookToRow,
  empty: EMPTY_BOOK,
};
