import type { MetadataRoute } from "next";
import type { PostSummary } from "./posts";

// What /sitemap.xml lists (app/sitemap.ts loads the articles). A plain
// function so it can be tested without the database. Signed-in and private
// pages (admin, settings, sign-in, /auth, /goodbye) are never listed.
// Section pages have no date: their content changes with each item.

export const SITEMAP_SECTIONS = ["/projects", "/writing", "/reading", "/music", "/games", "/hobbies"];

/** `posts`: published, newest first (as getPublishedPosts() returns them). */
export function sitemapEntries(posts: Pick<PostSummary, "slug" | "publishedAt">[], siteUrl: string): MetadataRoute.Sitemap {
  const absolute = (path: string) => new URL(path, siteUrl).href;
  const latest = posts[0]?.publishedAt;
  return [
    { url: absolute("/"), ...(latest && { lastModified: latest }) },
    ...SITEMAP_SECTIONS.map((path) => ({
      url: absolute(path),
      ...(path === "/writing" && latest && { lastModified: latest }),
    })),
    ...posts.map((post) => ({ url: absolute(`/writing/${post.slug}`), lastModified: post.publishedAt })),
    { url: absolute("/privacy") },
  ];
}
