import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { gameFromRow, platformSuggestions, type GameFields } from "./games";
import type { EditableItem } from "./item-form";
import { chipSuggestions } from "./suggestions";

// Reads for the Games form. Not cached: the admin always sees the current state.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One game for the form, or null if the id is malformed or unknown. */
export async function getEditableGame(id: string): Promise<EditableItem<GameFields> | null> {
  if (!UUID.test(id)) return null; // Postgres would reject it with an error instead of "not found"
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load game: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    updatedAt: data.updated_at,
    status: data.status === "published" ? "published" : "draft",
    fields: gameFromRow(data),
  };
}

/** Badges used on games so far, and platforms (used ones first, then the usual ones). */
export async function getGameSuggestions(): Promise<{ badges: string[]; platforms: string[] }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("games").select("badges, platform");
  if (error) throw new Error(`Failed to load suggestions: ${error.message}`);
  return {
    badges: chipSuggestions(data.map((g) => g.badges)),
    platforms: platformSuggestions(data.flatMap((g) => (g.platform ? [g.platform] : []))),
  };
}
