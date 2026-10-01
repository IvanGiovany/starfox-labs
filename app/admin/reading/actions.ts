"use server";

import { refresh, updateTag } from "next/cache";
import { bookDefinition, withReadingStatus, type BookFields } from "@/lib/admin/items/books";
import { explainItemError } from "@/lib/admin/items/item-errors";
import type { SaveItemInput } from "@/lib/admin/items/item-form";
import type { ListActionResult } from "@/lib/admin/items/list-actions";
import { ITEM_SECTIONS } from "@/lib/admin/items/sections";
import { saveItem } from "@/lib/admin/items/save-item";
import { requireAdmin } from "@/lib/auth";
import { isPlausibleToday } from "@/lib/format";
import { READING_STATUSES, type ReadingStatus } from "@/lib/reading";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const section = ITEM_SECTIONS.reading;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The list's one-tap step ("Start reading", "Mark as read"). Fills the obvious
 * date the same way the form does, never overwriting one. `today` is the
 * admin's local date from the browser; it must plausibly be today somewhere.
 */
export async function setReadingStatus(id: string, status: string, today: string): Promise<ListActionResult> {
  await requireAdmin();
  if (!UUID.test(id) || !(READING_STATUSES as readonly string[]).includes(status) || !isPlausibleToday(today)) {
    return { ok: false, error: "That request didn't make sense. Reload and try again." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: book, error: readError } = await supabase.from("books").select("started_on, finished_on").eq("id", id).maybeSingle();
  if (readError) return { ok: false, error: explainItemError("books", readError).message };
  if (!book) return { ok: false, error: "This book no longer exists. Reload the list." };

  const next = withReadingStatus(
    { readingStatus: "to_read" as ReadingStatus, startedOn: book.started_on ?? "", finishedOn: book.finished_on ?? "" },
    status as ReadingStatus,
    today,
  );
  const { error } = await supabase
    .from("books")
    .update({ reading_status: next.readingStatus, started_on: next.startedOn || null, finished_on: next.finishedOn || null })
    .eq("id", id);
  if (error) return { ok: false, error: explainItemError("books", error).message };

  updateTag(section.cacheTag);
  updateTag("home");
  updateTag("posts");
  refresh();
  return { ok: true };
}

/** The Reading form's Save draft / Publish / Update / Unpublish (see saveItem). */
export async function saveBook(input: SaveItemInput<BookFields>) {
  return saveItem(bookDefinition, input);
}
