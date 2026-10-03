import { Suspense } from "react";
import { ItemList } from "@/components/admin/item-list";
import { ItemListPage } from "@/components/admin/item-list-page";
import { ITEM_SECTIONS } from "@/lib/admin/items/sections";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setPlayStatus } from "./actions";
import { GAME_LIST_COLUMNS, gameListRow } from "./list-row";

const section = ITEM_SECTIONS.games;

// The list streams in behind its own <Suspense> and checks the admin itself:
// client navigations inside /admin don't re-run the layout (see CLAUDE.md).
export default function AdminGames() {
  return (
    <ItemListPage title={section.label} newHref="/admin/games/new" newLabel="New game">
      <Suspense fallback={<p className="py-6 text-fg-muted">Loading games…</p>}>
        <Games />
      </Suspense>
    </ItemListPage>
  );
}

// Drafts included, in the order the Games page uses (drag to reorder).
async function Games() {
  await requireAdmin("/admin/games");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("games")
    .select(GAME_LIST_COLUMNS)
    .order("sort_order")
    .order("created_at", { ascending: false })
    .order("id"); // a fully determined order, even when the other columns tie
  if (error) throw new Error(`Failed to load games: ${error.message}`);

  return <ItemList sectionKey={section.key} singular={section.singular} rows={data.map(gameListRow)} order={section.order} quickAction={setPlayStatus} />;
}
