import type { ItemListRow } from "@/components/admin/item-list";
import type { Tables } from "@/lib/database.types";
import { isImageStyle, LEARNING_CATEGORY, type ImageStyle } from "@/lib/hobbies";
import { mediaUrl } from "@/lib/media";

// One hobby item as a row of the admin list: a detail line with its category,
// card style and where it leads (and "No image" when a photo or cut-out card
// still needs one), and a LEARNING badge on what feeds the home Learning card.

export type HobbyListColumns = Pick<
  Tables<"hobby_items">,
  "id" | "title" | "status" | "image_path" | "badges" | "show_on_home" | "card_size" | "category" | "image_style" | "url" | "post_id"
>;

/** The columns the list selects. */
export const HOBBY_LIST_COLUMNS = "id, title, status, image_path, badges, show_on_home, card_size, category, image_style, url, post_id";

const STYLE_WORDS: Record<ImageStyle, string> = { photo: "Photo", cutout: "Cut-out", none: "Text card" };

export function hobbyListRow(hobby: HobbyListColumns): ItemListRow {
  const style = isImageStyle(hobby.image_style) ? hobby.image_style : "photo";
  return {
    id: hobby.id,
    title: hobby.title,
    status: hobby.status === "published" ? "published" : "draft",
    imageUrl: hobby.image_path ? mediaUrl(hobby.image_path) : null,
    detail: [
      hobby.category ?? "No category",
      STYLE_WORDS[style],
      style !== "none" && !hobby.image_path ? "No image" : "",
      hobby.url ? "Link" : hobby.post_id ? "Article" : "",
    ]
      .filter(Boolean)
      .join(" · "),
    badges: hobby.badges,
    showOnHome: hobby.show_on_home,
    cardSize: hobby.card_size === "wide" ? "wide" : "small",
    stateBadge: hobby.category === LEARNING_CATEGORY ? "LEARNING" : undefined,
  };
}
