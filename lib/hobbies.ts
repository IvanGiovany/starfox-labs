// Hobbies: how a hobby card shows its image, the category that feeds the
// home page's "Learning" card, and how an item is described on the public
// pages. Shared by the admin (it runs in the browser too, so nothing
// server-only here), the Hobbies page and (step 6) the home grid.

/** photo: fills the card, with a caption. cutout: an object on a transparent background. none: a text card. */
export const IMAGE_STYLES = ["photo", "cutout", "none"] as const;
export type ImageStyle = (typeof IMAGE_STYLES)[number];

export const IMAGE_STYLE_LABELS: Record<ImageStyle, string> = {
  photo: "PHOTO",
  cutout: "CUT-OUT",
  none: "NONE",
};

export function isImageStyle(value: string): value is ImageStyle {
  return (IMAGE_STYLES as readonly string[]).includes(value);
}

/** Items in this category are what Ivan is learning now (the home page's Learning card). */
export const LEARNING_CATEGORY = "Learning";

/** Where a hobby card goes: Ivan's link, else the article once it's published. Null: nowhere (no ↗). */
export function hobbyHref(row: { url: string | null; post: { slug: string; status: string } | null }): string | null {
  if (row.url) return row.url;
  return row.post?.status === "published" ? `/writing/${row.post.slug}` : null;
}

/**
 * A hobby card's badges: items in the Learning category lead with a LEARNING
 * badge (Ivan's own "Learning" badge isn't repeated), then Ivan's badges.
 */
export function hobbyBadges(category: string | null, badges: string[]): string[] {
  const isLearning = (text: string | null) => text?.trim().toLowerCase() === LEARNING_CATEGORY.toLowerCase();
  return isLearning(category) ? [LEARNING_CATEGORY, ...badges.filter((badge) => !isLearning(badge))] : badges;
}

/** A photo card's caption: Ivan's caption, or the item's title. */
export function hobbyCaption(caption: string | null, title: string): string {
  return caption?.trim() || title;
}

/**
 * The Hobbies · All card, as text pieces ("strong" ones are in full ink):
 * "4 things across 3 hobbies." Categories are counted ignoring case.
 */
export function hobbiesSummary(items: { category: string | null }[]): { text: string; strong?: boolean }[] {
  const hobbies = new Set(items.flatMap((item) => (item.category?.trim() ? [item.category.trim().toLowerCase()] : []))).size;
  const things = items.length;
  return [
    { text: String(things), strong: true },
    { text: things === 1 ? " thing" : " things" },
    ...(hobbies > 0 ? [{ text: hobbies === 1 ? " in " : " across " }, { text: String(hobbies), strong: true }, { text: hobbies === 1 ? " hobby" : " hobbies" }] : []),
    { text: "." },
  ];
}
