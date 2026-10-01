import "server-only";
import { updateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { explainItemError } from "./item-errors";
import { parseLinkRequest, type LinkTarget } from "./link-target";
import { ITEM_SECTIONS } from "./sections";

// Both halves of "Write the article" that need the database: loading the item
// the new article is for, and linking them once the article is first saved.
// Callers check the admin first (requireAdmin); RLS checks again.

/** The item behind ?for=projects:<id>, or null if the value is invalid or the item is gone. */
export async function getLinkTarget(raw: unknown): Promise<LinkTarget | null> {
  const request = parseLinkRequest(raw);
  if (!request) return null;
  const section = ITEM_SECTIONS[request.section];

  const supabase = await createSupabaseServerClient();
  // supabase-js can't type a table chosen at runtime (see save-item.ts).
  const { data } = await supabase.from(section.table as "projects").select("title, post_id").eq("id", request.itemId).maybeSingle();
  if (!data) return null;
  return { ...request, label: section.label, itemTitle: data.title, hasArticle: data.post_id !== null };
}

/**
 * Links a newly saved article to the item it was written for. Only fills an
 * empty link: if the item gained an article in the meantime, nothing changes.
 */
export async function linkArticleToItem(raw: unknown, postId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const request = parseLinkRequest(raw);
  if (!request) return { ok: false, error: "The item to link to wasn't recognised." };
  const section = ITEM_SECTIONS[request.section];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from(section.table as "projects")
    .update({ post_id: postId })
    .eq("id", request.itemId)
    .is("post_id", null)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: explainItemError(section.table, error).message };
  if (!data) return { ok: false, error: `The ${section.singular} already has an article (or was deleted), so this one wasn't linked.` };

  updateTag(section.cacheTag);
  updateTag("home");
  return { ok: true };
}
