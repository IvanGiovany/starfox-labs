import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/posts";
import { site } from "@/lib/site";
import { sitemapEntries } from "@/lib/sitemap";

// /sitemap.xml: every public page, so search engines find new articles fast
// (what's listed: lib/sitemap.ts). Prerendered like a page: the articles come
// from the cached getPublishedPosts(), so it refreshes when the "posts" cache
// does (publishing in the admin updates it).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapEntries(await getPublishedPosts(), site.url);
}
