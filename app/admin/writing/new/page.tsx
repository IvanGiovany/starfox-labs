import { getCheatSheet } from "@/lib/admin/cheat-sheet";
import { getTagSuggestions } from "@/lib/admin/posts";
import { PostEditor } from "../post-editor";

export default async function NewArticle() {
  const [tagSuggestions, cheatSheet] = await Promise.all([getTagSuggestions(), getCheatSheet()]);
  return <PostEditor post={null} tagSuggestions={tagSuggestions} cheatSheet={cheatSheet} />;
}
