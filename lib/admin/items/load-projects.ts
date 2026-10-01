import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EditableItem } from "./item-form";
import { projectFromRow, type ProjectFields } from "./projects";
import { chipSuggestions } from "./suggestions";

// Reads for the Projects form. Not cached: the admin always sees the current state.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One project for the form, or null if the id is malformed or unknown. */
export async function getEditableProject(id: string): Promise<EditableItem<ProjectFields> | null> {
  if (!UUID.test(id)) return null; // Postgres would reject it with an error instead of "not found"
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load project: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    updatedAt: data.updated_at,
    status: data.status === "published" ? "published" : "draft",
    fields: projectFromRow(data),
  };
}

/** Badges and stack entries used on projects so far, most used first. */
export async function getProjectSuggestions(): Promise<{ badges: string[]; stack: string[] }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("projects").select("badges, stack");
  if (error) throw new Error(`Failed to load suggestions: ${error.message}`);
  return { badges: chipSuggestions(data.map((p) => p.badges)), stack: chipSuggestions(data.map((p) => p.stack)) };
}
