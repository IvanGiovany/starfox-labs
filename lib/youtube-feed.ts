// The channel's newest videos, from YouTube's public feed
// (youtube.com/feeds/videos.xml?channel_id=…): no API key, no quota. Read on
// the server and cached for an hour (lib/youtube-loader.ts). This file is
// the plain part, so it can be tested with a saved feed.

export type Video = {
  id: string;
  title: string;
  publishedAt: string;
  url: string;
  thumbnail: string;
};

/** The small thumbnail every video has (480 × 360, letterboxed). */
export const smallThumbnail = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
/** The sharp one (1280 × 720); most videos have it, some don't. */
export const largeThumbnail = (id: string) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;

export const feedUrl = (channelId: string) => `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;

/** XML text back to plain text (the feed escapes titles). */
function decode(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * The videos in a feed, newest first. Anything malformed (no 11-character id,
 * no title, no valid date) is skipped rather than breaking the home page.
 */
export function parseYouTubeFeed(xml: string): Video[] {
  const videos: Video[] = [];
  for (const entry of xml.split("<entry>").slice(1)) {
    const id = /<yt:videoId>([\w-]{11})<\/yt:videoId>/.exec(entry)?.[1];
    const title = decode(/<title>([^<]*)<\/title>/.exec(entry)?.[1] ?? "").trim();
    const publishedAt = /<published>([^<]+)<\/published>/.exec(entry)?.[1] ?? "";
    if (!id || !title || Number.isNaN(Date.parse(publishedAt))) continue;
    videos.push({ id, title, publishedAt, url: `https://www.youtube.com/watch?v=${id}`, thumbnail: smallThumbnail(id) });
  }
  return videos.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id));
}
