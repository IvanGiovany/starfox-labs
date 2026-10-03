import type { ItemListRow } from "@/components/admin/item-list";
import type { Tables } from "@/lib/database.types";
import { isPlayStatus, PLAY_STATUS_LABELS } from "@/lib/games";
import { mediaUrl } from "@/lib/media";

// One game as a row of the admin list: its status badge, a detail line ending
// with whether the review exists (publishing needs it), and, while it's being
// played, one-tap "Finished" / "Dropped". Going back to playing is done in the form.

export type GameListColumns = Pick<
  Tables<"games">,
  "id" | "title" | "status" | "image_path" | "badges" | "show_on_home" | "card_size" | "platform" | "hours_played" | "rating" | "play_status" | "post_id"
>;

/** The columns the list selects. */
export const GAME_LIST_COLUMNS = "id, title, status, image_path, badges, show_on_home, card_size, platform, hours_played, rating, play_status, post_id";

const PLAYING_STEPS: NonNullable<ItemListRow["quickSteps"]> = [
  { label: "Finished", value: "finished" },
  { label: "Dropped", value: "dropped" },
];

export function gameListRow(game: GameListColumns): ItemListRow {
  const playStatus = isPlayStatus(game.play_status) ? game.play_status : "playing";
  return {
    id: game.id,
    title: game.title,
    status: game.status === "published" ? "published" : "draft",
    imageUrl: game.image_path ? mediaUrl(game.image_path) : null,
    detail: [
      game.platform,
      game.hours_played !== null ? `${game.hours_played} h` : "",
      game.rating ? `${game.rating}/10` : "",
      game.post_id ? "Review" : "No review",
    ]
      .filter(Boolean)
      .join(" · "),
    badges: game.badges,
    showOnHome: game.show_on_home,
    cardSize: game.card_size === "wide" ? "wide" : "small",
    stateBadge: PLAY_STATUS_LABELS[playStatus],
    quickSteps: playStatus === "playing" ? PLAYING_STEPS : [],
  };
}
