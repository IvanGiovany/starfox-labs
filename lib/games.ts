// Games: what a game's play status means, and how a game is described on
// the public pages. Shared by the admin (it runs in the browser too, so
// nothing server-only here) and the Games page.

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

const hoursFormat = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });

/** 62.5 → "62.5 h", 12 → "12 h", 1234.5 → "1,234.5 h". */
export function formatHours(hours: number): string {
  return `${hoursFormat.format(hours)} h`;
}

/** What a game's details line is made from. */
export type GameFacts = { platform: string | null; hoursPlayed: number | null; rating: number | null };

/**
 * A game's details line: "PC · 62.5 h · 9/10", leaving out what's missing.
 * `short` (phone cards) drops the platform, unless it's the only fact there is.
 */
export function gameDetails({ platform, hoursPlayed, rating }: GameFacts, short = false): string {
  const numbers = [hoursPlayed != null ? formatHours(hoursPlayed) : "", rating != null ? `${rating}/10` : ""].filter(Boolean);
  const parts = short && numbers.length > 0 ? numbers : [platform ?? "", ...numbers].filter(Boolean);
  return parts.join(" · ");
}

/** Where a game's card goes: its review, once published. Null: the game isn't shown yet. */
export function gameHref(row: { post: { slug: string; status: string } | null }): string | null {
  return row.post?.status === "published" ? `/writing/${row.post.slug}` : null;
}

/**
 * The Games · Hours card, as text pieces ("strong" ones are in full ink):
 * "62.5 hours across 3 games, 1 finished." Games without hours add nothing to
 * the total; with no hours at all it's just "3 games, 1 finished."
 */
export function hoursSummary(games: (Pick<GameFacts, "hoursPlayed"> & { playStatus: PlayStatus })[]): { text: string; strong?: boolean }[] {
  // Rounded to one decimal, as stored, so adding up doesn't show 0.30000000000000004.
  const hours = Math.round(games.reduce((sum, g) => sum + (g.hoursPlayed ?? 0), 0) * 10) / 10;
  const finished = games.filter((g) => g.playStatus === "finished").length;
  const plural = (count: number, word: string) => (count === 1 ? word : `${word}s`);

  return [
    ...(hours > 0 ? [{ text: hoursFormat.format(hours), strong: true }, { text: ` ${plural(hours, "hour")} across ` }] : []),
    { text: String(games.length), strong: true },
    { text: ` ${plural(games.length, "game")}` },
    ...(finished > 0 ? [{ text: ", " }, { text: String(finished), strong: true }, { text: " finished" }] : []),
    { text: "." },
  ];
}
