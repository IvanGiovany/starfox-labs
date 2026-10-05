import { cacheLife, cacheTag } from "next/cache";
import { hobbyBadges, hobbyHref, isImageStyle, type ImageStyle } from "./hobbies";
import { mediaUrl } from "./media";
import { supabasePublic } from "./supabase/public";

// Hobby items for the public pages. Cached for an hour and tagged
// "hobby_items" (and "posts": a card links to its article only once that's
// published); saving in the admin refreshes both tags, so changes show at
// once. Kept apart from ./hobbies.ts, which the admin's form also loads in
// the browser.

export type Hobby = {
  id: string;
  title: string;
  category: string | null;
  subtitle: string | null;
  note: string | null;
  /** How the card looks. A photo or cut-out without an image becomes a text card ("none"). */
  style: ImageStyle;
  imageUrl: string | null;
  imageAlt: string;
  caption: string | null;
  /** LEARNING first for the Learning category, then Ivan's badges. */
  badges: string[];
  cardSize: "small" | "wide";
  /** Ivan's link, else the published article; null: the card isn't a link. */
  href: string | null;
};

type HobbyRow = {
  id: string;
  title: string;
  category: string | null;
  subtitle: string | null;
  note: string | null;
  image_style: string;
  image_path: string | null;
  image_alt: string | null;
  caption: string | null;
  badges: string[];
  card_size: string;
  url: string | null;
  post: { slug: string; status: string } | null;
};

/** Published hobby items in Ivan's order (drag to reorder in the admin). */
export async function getPublishedHobbies(): Promise<Hobby[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("hobby_items", "posts");

  const { data, error } = await supabasePublic
    .from("hobby_items")
    .select("id, title, category, subtitle, note, image_style, image_path, image_alt, caption, badges, card_size, url, post:posts(slug, status)")
    .eq("status", "published")
    .order("sort_order")
    .order("created_at", { ascending: false })
    .order("id")
    .returns<HobbyRow[]>();
  if (error) throw new Error(`Failed to load hobby items: ${error.message}`);

  return data.map((row) => {
    const style = isImageStyle(row.image_style) ? row.image_style : "photo";
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      subtitle: row.subtitle,
      note: row.note,
      style: row.image_path ? style : "none",
      imageUrl: row.image_path ? mediaUrl(row.image_path) : null,
      imageAlt: row.image_alt ?? "",
      caption: row.caption,
      badges: hobbyBadges(row.category, row.badges),
      cardSize: row.card_size === "wide" ? "wide" : "small",
      href: hobbyHref(row),
    };
  });
}
