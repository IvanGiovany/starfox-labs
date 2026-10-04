import { Suspense } from "react";
import { ItemList } from "@/components/admin/item-list";
import { ItemListPage } from "@/components/admin/item-list-page";
import { ITEM_SECTIONS } from "@/lib/admin/items/sections";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HOBBY_LIST_COLUMNS, hobbyListRow } from "./list-row";

const section = ITEM_SECTIONS.hobbies;

// The list streams in behind its own <Suspense> and checks the admin itself:
// client navigations inside /admin don't re-run the layout (see CLAUDE.md).
export default function AdminHobbies() {
  return (
    <ItemListPage title={section.label} newHref="/admin/hobbies/new" newLabel="New hobby item">
      <Suspense fallback={<p className="py-6 text-fg-muted">Loading hobby items…</p>}>
        <Hobbies />
      </Suspense>
    </ItemListPage>
  );
}

// Drafts included, in the order the Hobbies page uses (drag to reorder).
async function Hobbies() {
  await requireAdmin("/admin/hobbies");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("hobby_items")
    .select(HOBBY_LIST_COLUMNS)
    .order("sort_order")
    .order("created_at", { ascending: false })
    .order("id"); // a fully determined order, even when the other columns tie
  if (error) throw new Error(`Failed to load hobby items: ${error.message}`);

  return <ItemList sectionKey={section.key} singular={section.singular} rows={data.map(hobbyListRow)} order={section.order} />;
}
