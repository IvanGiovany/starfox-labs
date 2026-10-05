import { cacheLife, cacheTag } from "next/cache";
import { gameHref, isPlayStatus, type PlayStatus } from "./games";
import { mediaUrl } from "./media";
import { supabasePublic } from "./supabase/public";

// Games for the public pages. Cached for an hour and tagged "games" (and
// "posts": a game shows only once its review is published); saving in the
// admin refreshes both tags, so changes show at once. Kept apart from
// ./games.ts, which the admin's form also loads in the browser.

export type Game = {
  id: string;
  title: string;
  playStatus: PlayStatus;
  /** Extra badges Ivan added, shown after the status badge. */
  badges: string[];
  platform: string | null;
  hoursPlayed: number | null;
  rating: number | null;
  /** Ivan's own screenshot, or null (then the card is a text card). */
  imageUrl: string | null;
  imageAlt: string;
  cardSize: "small" | "wide";
  /** Ivan's review: every card opens it. */
  href: string;
  /** Marked "Show on home" in the admin. */
  showOnHome: boolean;
  /** Where it sorts on home (newest first): when it was finished, else when it was added. */
  homeDate: string;
};

type GameRow = {
  id: string;
  title: string;
  play_status: string;
  badges: string[];
  platform: string | null;
  hours_played: number | null;
  rating: number | null;
  image_path: string | null;
  image_alt: string | null;
  card_size: string;
  show_on_home: boolean;
  finished_on: string | null;
  created_at: string;
  post: { slug: string; status: string } | null;
};

/** Published games whose review is live, in Ivan's order (drag to reorder in the admin). */
export async function getPublishedGames(): Promise<Game[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("games", "posts");

  const { data, error } = await supabasePublic
    .from("games")
    .select("id, title, play_status, badges, platform, hours_played, rating, image_path, image_alt, card_size, show_on_home, finished_on, created_at, post:posts(slug, status)")
    .eq("status", "published")
    .order("sort_order")
    .order("created_at", { ascending: false })
    .order("id")
    .returns<GameRow[]>();
  if (error) throw new Error(`Failed to load games: ${error.message}`);

  return data.flatMap((row) => {
    const href = gameHref(row);
    if (!href) return [];
    return [
      {
        id: row.id,
        title: row.title,
        playStatus: isPlayStatus(row.play_status) ? row.play_status : "playing",
        badges: row.badges,
        platform: row.platform,
        // numeric comes back as a number from PostgREST; Number() also covers a string.
        hoursPlayed: row.hours_played == null ? null : Number(row.hours_played),
        rating: row.rating,
        imageUrl: row.image_path ? mediaUrl(row.image_path) : null,
        imageAlt: row.image_alt ?? "",
        cardSize: row.card_size === "wide" ? ("wide" as const) : ("small" as const),
        href,
        showOnHome: row.show_on_home,
        homeDate: row.finished_on ?? row.created_at,
      },
    ];
  });
}
