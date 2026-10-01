import { notFound } from "next/navigation";
import { getCheatSheet } from "@/lib/admin/cheat-sheet";
import { getEditablePost, getTagSuggestions } from "@/lib/admin/posts";
import { PostEditor } from "../post-editor";

export default async function EditArticle({ params }: PageProps<"/admin/writing/[id]">) {
  const { id } = await params;
  const [post, tagSuggestions, cheatSheet] = await Promise.all([getEditablePost(id), getTagSuggestions(), getCheatSheet()]);
  if (!post) notFound();

  // key: opening another article starts a fresh editor instead of reusing this one's state.
  return <PostEditor key={post.id} post={post} tagSuggestions={tagSuggestions} cheatSheet={cheatSheet} />;
}
