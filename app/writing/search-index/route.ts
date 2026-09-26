import { getPublishedPostsWithBody } from "@/lib/posts";
import { normalize, toPlainText, type SearchIndex } from "@/lib/search";

// Article bodies as plain, normalized text, keyed by slug. The Writing page
// fetches this only when someone starts typing in the search box, so a normal
// visit never downloads every article body.
//
// It's prerendered like a page: the data comes from the cached
// getPublishedPostsWithBody(), so it refreshes when the "posts" cache does.

export async function GET() {
  const posts = await getPublishedPostsWithBody();
  const index: SearchIndex = Object.fromEntries(
    posts.map((post) => [post.slug, normalize(toPlainText(post.bodyMd))]),
  );
  return Response.json(index);
}
