import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ITEM_SECTIONS, type ItemSectionKey } from "./sections";

// Every article, for the "linked article" picker on item forms, with the item
// that already links it (an article belongs to at most one item). Drafts are
// included on both sides: the post_items view only covers published items,
// because it serves the public "about this" panel.

export type ArticleOption = {
  id: string;
  title: string;
  status: "draft" | "published";
  /** The item already linking this article, if any. */
  linkedFrom: { section: ItemSectionKey; label: string; itemId: string; itemTitle: string } | null;
};

export async function getArticleOptions(): Promise<ArticleOption[]> {
  const supabase = await createSupabaseServerClient();
  const sections = Object.values(ITEM_SECTIONS);

  const [posts, ...links] = await Promise.all([
    supabase.from("posts").select("id, title, status").order("updated_at", { ascending: false }),
    // One small query per table; supabase-js can't type a table chosen at runtime (see save-item.ts).
    ...sections.map((s) => supabase.from(s.table as "projects").select("id, title, post_id").not("post_id", "is", null)),
  ]);
  if (posts.error) throw new Error(`Failed to load articles: ${posts.error.message}`);

  const linkedBy = new Map<string, NonNullable<ArticleOption["linkedFrom"]>>();
  links.forEach((result, i) => {
    if (result.error) throw new Error(`Failed to load article links: ${result.error.message}`);
    for (const item of result.data) {
      if (item.post_id) {
        linkedBy.set(item.post_id, { section: sections[i].key, label: sections[i].label, itemId: item.id, itemTitle: item.title });
      }
    }
  });

  return posts.data.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status === "published" ? "published" : "draft",
    linkedFrom: linkedBy.get(p.id) ?? null,
  }));
}
