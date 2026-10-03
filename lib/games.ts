// Games: what a game's play status means. Shared by the admin and (in Phase 3)
// the public Games page, so both use the same words.

export const PLAY_STATUSES = ["playing", "finished", "dropped"] as const;
export type PlayStatus = (typeof PLAY_STATUSES)[number];

/** The words on a game's badge. */
export const PLAY_STATUS_LABELS: Record<PlayStatus, string> = {
  playing: "PLAYING",
  finished: "FINISHED",
  dropped: "DROPPED",
};

export function isPlayStatus(value: string): value is PlayStatus {
  return (PLAY_STATUSES as readonly string[]).includes(value);
}
