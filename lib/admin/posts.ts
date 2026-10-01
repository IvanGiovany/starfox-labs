import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EditablePost, PostStatus } from "./post-form";

// Reads for the article editor. Not cached: the admin always sees the
// current state, drafts included (RLS lets only the admin read those).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One article for the editor, or null if the id is malformed or unknown. */
export async function getEditablePost(id: string): Promise<EditablePost | null> {
  if (!UUID.test(id)) return null; // Postgres would reject it with an error instead of "not found"

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, slug, summary, tags, youtube_url, body_md, status, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load article: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    updatedAt: data.updated_at,
    status: data.status as PostStatus,
    fields: {
      title: data.title,
      slug: data.slug,
      summary: data.summary,
      tags: data.tags,
      youtubeUrl: data.youtube_url ?? "",
      bodyMd: data.body_md,
    },
  };
}

/** Every tag used so far (drafts included), most used first, for the tag suggestions. */
export async function getTagSuggestions(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("posts").select("tags");
  if (error) throw new Error(`Failed to load tags: ${error.message}`);

  const counts = new Map<string, number>();
  for (const row of data) {
    for (const tag of row.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag);
}
