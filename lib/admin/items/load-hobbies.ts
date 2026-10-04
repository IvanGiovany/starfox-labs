import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { categorySuggestions, hobbyFromRow, type HobbyFields } from "./hobbies";
import type { EditableItem } from "./item-form";
import { chipSuggestions } from "./suggestions";

// Reads for the Hobbies form. Not cached: the admin always sees the current state.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One hobby item for the form, or null if the id is malformed or unknown. */
export async function getEditableHobby(id: string): Promise<EditableItem<HobbyFields> | null> {
  if (!UUID.test(id)) return null; // Postgres would reject it with an error instead of "not found"
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("hobby_items").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load hobby item: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    updatedAt: data.updated_at,
    status: data.status === "published" ? "published" : "draft",
    fields: hobbyFromRow(data),
  };
}

/** Badges used on hobby items so far, and categories (used ones first, then Learning). */
export async function getHobbySuggestions(): Promise<{ badges: string[]; categories: string[] }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("hobby_items").select("badges, category");
  if (error) throw new Error(`Failed to load suggestions: ${error.message}`);
  return {
    badges: chipSuggestions(data.map((h) => h.badges)),
    categories: categorySuggestions(data.flatMap((h) => (h.category ? [h.category] : []))),
  };
}
