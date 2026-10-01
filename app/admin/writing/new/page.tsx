import { Suspense } from "react";
import { getCheatSheet } from "@/lib/admin/cheat-sheet";
import { getLinkTarget } from "@/lib/admin/items/link-article";
import { getTagSuggestions } from "@/lib/admin/posts";
import { requireAdmin } from "@/lib/auth";
import { PostEditor } from "../post-editor";

// Request-time work sits behind this page's own <Suspense> (see app/admin/writing/page.tsx).
// ?for=projects:<id> comes from an item's "Write the article" button.
export default function NewArticle({ searchParams }: PageProps<"/admin/writing/new">) {
  return (
    <Suspense fallback={<p className="py-6 text-fg-muted">Loading editor…</p>}>
      <NewArticleEditor searchParams={searchParams} />
    </Suspense>
  );
}

async function NewArticleEditor({ searchParams }: { searchParams: PageProps<"/admin/writing/new">["searchParams"] }) {
  await requireAdmin("/admin/writing/new");
  const { for: linkFor } = await searchParams;
  const [tagSuggestions, cheatSheet, linkTarget] = await Promise.all([
    getTagSuggestions(),
    getCheatSheet(),
    getLinkTarget(typeof linkFor === "string" ? linkFor : null),
  ]);
  return <PostEditor post={null} tagSuggestions={tagSuggestions} cheatSheet={cheatSheet} linkTarget={linkTarget} />;
}
