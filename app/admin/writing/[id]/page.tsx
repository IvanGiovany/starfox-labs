import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCheatSheet } from "@/lib/admin/cheat-sheet";
import { getEditablePost, getTagSuggestions } from "@/lib/admin/posts";
import { requireAdmin } from "@/lib/auth";
import { PostEditor } from "../post-editor";

// Request-time work (the id, the session, the database) sits behind this
// page's own <Suspense> (see app/admin/writing/page.tsx).
export default function EditArticle({ params }: PageProps<"/admin/writing/[id]">) {
  return (
    <Suspense fallback={<p className="py-6 text-fg-muted">Loading article…</p>}>
      <EditArticleEditor params={params} />
    </Suspense>
  );
}

async function EditArticleEditor({ params }: { params: PageProps<"/admin/writing/[id]">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/writing/${id}`);
  const [post, tagSuggestions, cheatSheet] = await Promise.all([getEditablePost(id), getTagSuggestions(), getCheatSheet()]);
  if (!post) notFound();

  // key: opening another article starts a fresh editor instead of reusing this one's state.
  return <PostEditor key={post.id} post={post} tagSuggestions={tagSuggestions} cheatSheet={cheatSheet} />;
}
