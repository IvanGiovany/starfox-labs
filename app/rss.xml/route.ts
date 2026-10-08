import { getPublishedPosts } from "@/lib/posts";
import { rssFeed } from "@/lib/rss";
import { site } from "@/lib/site";

// /rss.xml: the newest articles for feed readers (built by lib/rss.ts).
// Prerendered like a page: the articles come from the cached
// getPublishedPosts(), so it refreshes when the "posts" cache does
// (publishing in the admin updates it). Linked from the header and from every
// page's <head> (app/layout.tsx), so feed readers find it.
export async function GET() {
  const xml = rssFeed(await getPublishedPosts(), {
    title: site.name,
    siteUrl: site.url,
    description: "Writing by Gvan: software, projects, games, books and music as Spektral.",
  });
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
