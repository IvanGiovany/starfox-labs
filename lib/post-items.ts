import { cacheLife, cacheTag } from "next/cache";
import { mediaUrl } from "./media";
import { supabasePublic } from "./supabase/public";

// The item (project, book, song, game, hobby item) that links to an article,
// for the article's "about this" panel. One query to the `post_items` view,
// which only lists published items. Tagged with "posts" and every section's
// tag: saving an item refreshes them, so the panel follows at once.

export type PostItemSection = "projects" | "books" | "tracks" | "games" | "hobby_items";

export type PostItem = {
  section: PostItemSection;
  itemId: string;
  title: string;
  imageUrl: string | null;
  imageAlt: string;
  /** The section's own fields (see the post_items view), e.g. a project's url, repo_url and stack. */
  details: Record<string, unknown>;
};

export async function getPostItem(postId: string): Promise<PostItem | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("posts", "projects", "books", "tracks", "games", "hobby_items");

  const { data, error } = await supabasePublic.from("post_items").select("*").eq("post_id", postId).maybeSingle();
  if (error) throw new Error(`Failed to load the item for article ${postId}: ${error.message}`);
  if (!data?.section || !data.item_id || !data.title) return null;
  return {
    section: data.section as PostItemSection,
    itemId: data.item_id,
    title: data.title,
    imageUrl: data.image_path ? mediaUrl(data.image_path) : null,
    imageAlt: data.image_alt ?? "",
    details: data.details && typeof data.details === "object" && !Array.isArray(data.details) ? (data.details as Record<string, unknown>) : {},
  };
}

/** A text field from an item's details, or null. */
export const detailText = (details: Record<string, unknown>, key: string): string | null =>
  typeof details[key] === "string" && details[key] ? (details[key] as string) : null;

/** A list-of-text field from an item's details. */
export const detailList = (details: Record<string, unknown>, key: string): string[] =>
  Array.isArray(details[key]) ? (details[key] as unknown[]).filter((v): v is string => typeof v === "string") : [];
