import { cacheLife, cacheTag } from "next/cache";
import { site } from "./site";
import { feedUrl, largeThumbnail, parseYouTubeFeed, type Video } from "./youtube-feed";

/** Videos on the home page (Ivan, 2026-10-08). */
export const HOME_VIDEOS = 2;

/**
 * The channel's newest videos, for the home grid. Cached for an hour like the
 * other loaders ("youtube" tag). If YouTube can't be reached, or the feed
 * changes shape, this returns no videos and home shows the plain channel card
 * instead: it never breaks the page or the build. Each video gets the sharp
 * thumbnail when YouTube has one (it answers 404 otherwise).
 */
export async function getLatestVideos(): Promise<Video[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("youtube");
  if (!site.youtubeChannelId) return [];
  try {
    const res = await fetch(feedUrl(site.youtubeChannelId), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const videos = parseYouTubeFeed(await res.text()).slice(0, HOME_VIDEOS);
    return await Promise.all(
      videos.map(async (video) => {
        try {
          const sharp = await fetch(largeThumbnail(video.id), { method: "HEAD", signal: AbortSignal.timeout(3000) });
          return sharp.ok ? { ...video, thumbnail: largeThumbnail(video.id) } : video;
        } catch {
          return video;
        }
      }),
    );
  } catch {
    return [];
  }
}
