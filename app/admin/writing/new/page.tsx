import { getTagSuggestions } from "@/lib/admin/posts";
import { PostEditor } from "../post-editor";

export default async function NewArticle() {
  const tagSuggestions = await getTagSuggestions();
  return <PostEditor post={null} tagSuggestions={tagSuggestions} />;
}
