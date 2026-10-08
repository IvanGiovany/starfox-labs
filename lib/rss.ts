import type { PostSummary } from "./posts";

// The RSS 2.0 feed (/rss.xml): the newest articles with their summaries and a
// link to read them on the site (Ivan, 2026-10-08: summaries, not whole
// articles). A plain function so it can be tested without the database.

/** How many articles the feed carries. */
export const FEED_SIZE = 50;

/** Escapes text for XML: element content and attribute values. */
export function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Characters XML 1.0 doesn't allow at all (control characters other than tab and line breaks).
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

/** RSS dates are RFC 822: "Thu, 08 Oct 2026 09:00:00 GMT". */
export const rssDate = (iso: string) => new Date(iso).toUTCString();

type FeedPost = Pick<PostSummary, "slug" | "title" | "summary" | "tags" | "publishedAt">;

export function rssFeed(
  posts: FeedPost[],
  channel: { title: string; siteUrl: string; description: string },
): string {
  const absolute = (path: string) => new URL(path, channel.siteUrl).href;
  const items = posts.slice(0, FEED_SIZE).map((post) => {
    const link = absolute(`/writing/${post.slug}`);
    // The description is HTML, escaped once more to sit inside the XML.
    const html = `<p>${xmlEscape(post.summary)}</p><p><a href="${xmlEscape(link)}">Read it on ${xmlEscape(channel.title)}</a></p>`;
    return [
      "    <item>",
      `      <title>${xmlEscape(post.title)}</title>`,
      `      <link>${xmlEscape(link)}</link>`,
      `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
      `      <pubDate>${rssDate(post.publishedAt)}</pubDate>`,
      ...post.tags.map((tag) => `      <category>${xmlEscape(tag)}</category>`),
      `      <description>${xmlEscape(html)}</description>`,
      "    </item>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${xmlEscape(channel.title)}</title>`,
    `    <link>${xmlEscape(absolute("/writing"))}</link>`,
    `    <description>${xmlEscape(channel.description)}</description>`,
    "    <language>en</language>",
    `    <atom:link href="${xmlEscape(absolute("/rss.xml"))}" rel="self" type="application/rss+xml"/>`,
    // The newest article's date, not the clock: the feed only changes when an article does.
    ...(posts[0] ? [`    <lastBuildDate>${rssDate(posts[0].publishedAt)}</lastBuildDate>`] : []),
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
