import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { bookFromRow, type BookFields } from "./books";
import type { EditableItem } from "./item-form";
import { chipSuggestions } from "./suggestions";

// Reads for the Reading form. Not cached: the admin always sees the current state.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One book for the form, or null if the id is malformed or unknown. */
export async function getEditableBook(id: string): Promise<EditableItem<BookFields> | null> {
  if (!UUID.test(id)) return null; // Postgres would reject it with an error instead of "not found"
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("books").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load book: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    updatedAt: data.updated_at,
    status: data.status === "published" ? "published" : "draft",
    fields: bookFromRow(data),
  };
}

/** Badges used on books so far, most used first. */
export async function getBookBadgeSuggestions(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("books").select("badges");
  if (error) throw new Error(`Failed to load suggestions: ${error.message}`);
  return chipSuggestions(data.map((b) => b.badges));
}
