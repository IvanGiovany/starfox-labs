import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EditableItem } from "./item-form";
import { chipSuggestions } from "./suggestions";
import { trackFromRow, type TrackFields } from "./tracks";

// Reads for the Music form. Not cached: the admin always sees the current state.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One song for the form, or null if the id is malformed or unknown. */
export async function getEditableTrack(id: string): Promise<EditableItem<TrackFields> | null> {
  if (!UUID.test(id)) return null; // Postgres would reject it with an error instead of "not found"
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("tracks").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load song: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    updatedAt: data.updated_at,
    status: data.status === "published" ? "published" : "draft",
    fields: trackFromRow(data),
  };
}

/** Badges used on songs so far, most used first. */
export async function getTrackBadgeSuggestions(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("tracks").select("badges");
  if (error) throw new Error(`Failed to load suggestions: ${error.message}`);
  return chipSuggestions(data.map((t) => t.badges));
}
