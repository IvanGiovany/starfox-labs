import { cacheLife, cacheTag } from "next/cache";
import type { TrackLinkKey } from "./admin/items/tracks";
import { mediaUrl } from "./media";
import { supabasePublic } from "./supabase/public";

// Songs for the public pages. Cached for an hour and tagged "tracks" (and
// "posts": a song shows only once its article is published); saving in the
// admin refreshes both tags, so changes show at once.

export type Song = {
  id: string;
  title: string;
  badges: string[];
  note: string | null;
  /** "2026-09-18", or null. */
  releasedOn: string | null;
  coverUrl: string | null;
  coverAlt: string;
  cardSize: "small" | "wide";
  /** The song's article: every card opens it. */
  href: string;
};

type TrackRow = {
  id: string;
  title: string;
  badges: string[];
  note: string | null;
  released_on: string | null;
  image_path: string | null;
  image_alt: string | null;
  card_size: string;
  post: { slug: string; status: string } | null;
};

/** Where a song's card goes: its article, once published. Null: the song isn't shown yet. */
export function songHref(row: Pick<TrackRow, "post">): string | null {
  return row.post?.status === "published" ? `/writing/${row.post.slug}` : null;
}

/** The names of the places a song can be heard (the keys of `tracks.links`). */
export const TRACK_LINK_LABELS: Record<TrackLinkKey, string> = {
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  bandcamp: "Bandcamp",
  youtube: "YouTube",
  apple: "Apple Music",
};

/**
 * Finished songs whose article is live, in Ivan's order (drag to reorder in
 * the admin). Songs in progress show on home as "Now producing" instead.
 */
export async function getPublishedSongs(): Promise<Song[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("tracks", "posts");

  const { data, error } = await supabasePublic
    .from("tracks")
    .select("id, title, badges, note, released_on, image_path, image_alt, card_size, post:posts(slug, status)")
    .eq("status", "published")
    .eq("in_progress", false)
    .order("sort_order")
    .order("created_at", { ascending: false })
    .order("id")
    .returns<TrackRow[]>();
  if (error) throw new Error(`Failed to load songs: ${error.message}`);

  return data.flatMap((row) => {
    const href = songHref(row);
    if (!href) return [];
    return [
      {
        id: row.id,
        title: row.title,
        badges: row.badges,
        note: row.note,
        releasedOn: row.released_on,
        coverUrl: row.image_path ? mediaUrl(row.image_path) : null,
        coverAlt: row.image_alt ?? "",
        cardSize: row.card_size === "wide" ? ("wide" as const) : ("small" as const),
        href,
      },
    ];
  });
}
