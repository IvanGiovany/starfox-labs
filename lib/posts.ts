import { cacheLife, cacheTag } from "next/cache";
import { supabasePublic } from "./supabase/public";

// The one place pages get articles from. Pages never query Supabase directly,
// so the database shape (snake_case columns) stays out of the UI.

export type Post = {
  slug: string;
  title: string;
  summary: string;
  bodyMd: string;
  tags: string[];
  coverImageUrl: string | null;
  youtubeUrl: string | null;
  publishedAt: string; // ISO date
};

/** A post without its body, for lists and cards. */
export type PostSummary = Omit<Post, "bodyMd">;

export type TagCount = { tag: string; count: number };

// Cached for an hour and tagged "posts". Publishing in the admin editor
// (phase 2) will refresh the "posts" tag so new articles appear at once.
const POSTS_TAG = "posts";

const SUMMARY_COLUMNS = "slug, title, summary, tags, cover_image_url, youtube_url, published_at";

type PostRow = {
  slug: string;
  title: string;
  summary: string;
  body_md?: string;
  tags: string[];
  cover_image_url: string | null;
  youtube_url: string | null;
  published_at: string;
};

function toSummary(row: PostRow): PostSummary {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    tags: row.tags,
    coverImageUrl: row.cover_image_url,
    youtubeUrl: row.youtube_url,
    publishedAt: row.published_at,
  };
}

/** All published posts, newest first. RLS already hides drafts; the filter makes it explicit. */
export async function getPublishedPosts(): Promise<PostSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_TAG);

  const { data, error } = await supabasePublic
    .from("posts")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .returns<PostRow[]>();

  if (error) throw new Error(`Failed to load posts: ${error.message}`);
  return data.map(toSummary);
}

/** Published posts including their markdown body. Used for full-text search on /writing. */
export async function getPublishedPostsWithBody(): Promise<Post[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_TAG);

  const { data, error } = await supabasePublic
    .from("posts")
    .select(`${SUMMARY_COLUMNS}, body_md`)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .returns<PostRow[]>();

  if (error) throw new Error(`Failed to load posts: ${error.message}`);
  return data.map((row) => ({ ...toSummary(row), bodyMd: row.body_md ?? "" }));
}

/** One published post, or null if it doesn't exist (or is a draft). */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_TAG);

  const { data, error } = await supabasePublic
    .from("posts")
    .select(`${SUMMARY_COLUMNS}, body_md`)
    .eq("status", "published")
    .eq("slug", slug)
    .returns<PostRow[]>()
    .maybeSingle();

  if (error) throw new Error(`Failed to load post "${slug}": ${error.message}`);
  if (!data) return null;
  return { ...toSummary(data), bodyMd: data.body_md ?? "" };
}

/** Tags with how many published posts use each, most used first. */
export function countTags(posts: PostSummary[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Estimated reading time in minutes, at ~225 words per minute. */
export function readingTime(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 225));
}
