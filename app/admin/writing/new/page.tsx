import { Suspense } from "react";
import { getCheatSheet } from "@/lib/admin/cheat-sheet";
import { getTagSuggestions } from "@/lib/admin/posts";
import { requireAdmin } from "@/lib/auth";
import { PostEditor } from "../post-editor";

// Request-time work sits behind this page's own <Suspense> (see app/admin/writing/page.tsx).
export default function NewArticle() {
  return (
    <Suspense fallback={<p className="py-6 text-fg-muted">Loading editor…</p>}>
      <NewArticleEditor />
    </Suspense>
  );
}

async function NewArticleEditor() {
  await requireAdmin("/admin/writing/new");
  const [tagSuggestions, cheatSheet] = await Promise.all([getTagSuggestions(), getCheatSheet()]);
  return <PostEditor post={null} tagSuggestions={tagSuggestions} cheatSheet={cheatSheet} />;
}
