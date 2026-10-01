import { Suspense } from "react";
import { ItemList, type ItemListRow } from "@/components/admin/item-list";
import { ItemListPage } from "@/components/admin/item-list-page";
import { ITEM_SECTIONS } from "@/lib/admin/items/sections";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const section = ITEM_SECTIONS.music;

// The list streams in behind its own <Suspense> and checks the admin itself:
// client navigations inside /admin don't re-run the layout (see CLAUDE.md).
export default function AdminMusic() {
  return (
    <ItemListPage title={section.label} newHref="/admin/music/new" newLabel="New song">
      <Suspense fallback={<p className="py-6 text-fg-muted">Loading songs…</p>}>
        <Tracks />
      </Suspense>
    </ItemListPage>
  );
}

// Drafts included, in the order the Music page uses (drag to reorder). The
// detail line says what a finished song still needs before it can be published.
async function Tracks() {
  await requireAdmin("/admin/music");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tracks")
    .select("id, title, status, image_path, badges, show_on_home, card_size, in_progress, released_on, snippet_path, post_id")
    .order("sort_order")
    .order("created_at", { ascending: false })
    .order("id"); // a fully determined order, even when the other columns tie
  if (error) throw new Error(`Failed to load songs: ${error.message}`);

  const rows: ItemListRow[] = data.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status === "published" ? "published" : "draft",
    imageUrl: t.image_path ? mediaUrl(t.image_path) : null,
    detail: [
      t.released_on ? formatDate(t.released_on) : "",
      t.snippet_path ? "Snippet" : "No snippet",
      t.post_id ? "Article" : "No article",
    ]
      .filter(Boolean)
      .join(" · "),
    badges: t.badges,
    showOnHome: t.show_on_home,
    cardSize: t.card_size === "wide" ? "wide" : "small",
    stateBadge: t.in_progress ? "Now producing" : undefined,
  }));
  return <ItemList sectionKey={section.key} singular={section.singular} rows={rows} order={section.order} />;
}
