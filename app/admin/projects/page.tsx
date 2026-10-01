import { Suspense } from "react";
import { ItemList, type ItemListRow } from "@/components/admin/item-list";
import { ItemListPage } from "@/components/admin/item-list-page";
import { ITEM_SECTIONS } from "@/lib/admin/items/sections";
import { requireAdmin } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const section = ITEM_SECTIONS.projects;

// The list streams in behind its own <Suspense> and checks the admin itself:
// client navigations inside /admin don't re-run the layout (see CLAUDE.md).
export default function AdminProjects() {
  return (
    <ItemListPage title={section.label} newHref="/admin/projects/new" newLabel="New project">
      <Suspense fallback={<p className="py-6 text-fg-muted">Loading projects…</p>}>
        <Projects />
      </Suspense>
    </ItemListPage>
  );
}

// Drafts included (RLS lets the admin see them), in the order the section page uses.
async function Projects() {
  await requireAdmin("/admin/projects");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, status, image_path, badges, show_on_home, card_size, stack")
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load projects: ${error.message}`);

  const rows: ItemListRow[] = data.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status === "published" ? "published" : "draft",
    imageUrl: p.image_path ? mediaUrl(p.image_path) : null,
    detail: p.stack.join(" · "),
    badges: p.badges,
    showOnHome: p.show_on_home,
    cardSize: p.card_size === "wide" ? "wide" : "small",
  }));
  return <ItemList sectionKey={section.key} singular={section.singular} rows={rows} order={section.order} />;
}
