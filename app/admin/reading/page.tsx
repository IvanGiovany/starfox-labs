import { Suspense } from "react";
import { ItemList, type ItemListRow } from "@/components/admin/item-list";
import { ItemListPage } from "@/components/admin/item-list-page";
import { ITEM_SECTIONS } from "@/lib/admin/items/sections";
import { requireAdmin } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import { compareBooks, READING_STATUS_LABELS, READING_STATUSES, type ReadingStatus } from "@/lib/reading";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setReadingStatus } from "./actions";

const section = ITEM_SECTIONS.reading;

// The one-tap next step for each reading status. Going back is done in the form.
const NEXT_STEP: Record<ReadingStatus, ItemListRow["quickStep"]> = {
  to_read: { label: "Start reading", value: "reading" },
  reading: { label: "Mark as read", value: "read" },
  read: null,
};

// The list streams in behind its own <Suspense> and checks the admin itself:
// client navigations inside /admin don't re-run the layout (see CLAUDE.md).
export default function AdminReading() {
  return (
    <ItemListPage title={section.label} newHref="/admin/reading/new" newLabel="New book">
      <Suspense fallback={<p className="py-6 text-fg-muted">Loading books…</p>}>
        <Books />
      </Suspense>
    </ItemListPage>
  );
}

// Drafts included, in the Reading page's automatic order (no drag to reorder).
async function Books() {
  await requireAdmin("/admin/reading");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("books")
    .select("id, title, status, image_path, badges, show_on_home, card_size, author, reading_status, finished_on, rating, created_at");
  if (error) throw new Error(`Failed to load books: ${error.message}`);

  const books = data.map((b) => ({
    ...b,
    readingStatus: ((READING_STATUSES as readonly string[]).includes(b.reading_status) ? b.reading_status : "to_read") as ReadingStatus,
    finishedOn: b.finished_on,
    createdAt: b.created_at,
  }));
  books.sort(compareBooks);

  const rows: ItemListRow[] = books.map((b) => ({
    id: b.id,
    title: b.title,
    status: b.status === "published" ? "published" : "draft",
    imageUrl: b.image_path ? mediaUrl(b.image_path) : null,
    detail: [b.author, b.rating ? "★".repeat(b.rating) + "☆".repeat(5 - b.rating) : ""].filter(Boolean).join(" · "),
    badges: b.badges,
    showOnHome: b.show_on_home,
    cardSize: b.card_size === "wide" ? "wide" : "small",
    stateBadge: READING_STATUS_LABELS[b.readingStatus],
    quickStep: NEXT_STEP[b.readingStatus],
  }));
  return <ItemList sectionKey={section.key} singular={section.singular} rows={rows} order={section.order} quickAction={setReadingStatus} />;
}
