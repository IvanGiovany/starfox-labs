import { z } from "zod";
import type { Tables, TablesInsert } from "@/lib/database.types";
import { isNotInFuture } from "@/lib/format";
import { isPlayStatus, PLAY_STATUSES, type PlayStatus } from "@/lib/games";
import {
  baseFromRow,
  baseItemShape,
  baseToRow,
  EMPTY_BASE_ITEM,
  optionalDate,
  optionalText,
  type BaseItemFields,
  type FieldErrors,
  type ItemDefinition,
} from "./item-form";
import { ITEM_SECTIONS } from "./sections";

// Games: what one game holds, its rules, and how it maps to the `games`
// table. Clicking a game opens Ivan's review, so a published game needs its
// review article. Its play status (playing / finished / dropped) is separate
// from draft / published.

const section = ITEM_SECTIONS.games;

/** Offered in the platform box after the platforms already used. */
export const PLATFORM_SUGGESTIONS = ["PC", "PlayStation 5", "Nintendo Switch", "Xbox Series X|S", "Steam Deck"];

/** The column is numeric(7, 1): one decimal, under a million. */
export const MAX_HOURS = 99_999.9;

/**
 * Hours as typed ("42", "12.5", or "12,5" with a comma), kept as text so the
 * box can be empty. At most one decimal: the database would round 12.25 to
 * 12.3 quietly, so it's better to say so.
 */
const hoursText = z
  .string()
  .trim()
  .transform((value) => value.replace(",", "."))
  .refine((value) => value === "" || (/^(\d+(\.\d*)?|\.\d+)$/.test(value) && hasOneDecimalAtMost(Number(value))), "Type the hours as a number with at most one decimal, like 12.5.")
  .refine((value) => value === "" || Number(value) <= MAX_HOURS, "That's more hours than fit: the most is 99,999.9.");

function hasOneDecimalAtMost(hours: number): boolean {
  return Math.abs(hours * 10 - Math.round(hours * 10)) < 1e-9;
}

export const gameSchema = z.object({
  ...baseItemShape(section),
  playStatus: z.enum(PLAY_STATUSES),
  platform: optionalText(100),
  hoursPlayed: hoursText,
  rating: z.number().int().min(1, "Rate from 1 to 10.").max(10, "Rate from 1 to 10.").nullable(),
  finishedOn: optionalDate.refine((date) => date === "" || isNotInFuture(date), "The finish date can't be in the future."),
});

export type GameFields = BaseItemFields & {
  playStatus: PlayStatus;
  platform: string;
  hoursPlayed: string;
  rating: number | null;
  finishedOn: string;
};

export const EMPTY_GAME: GameFields = {
  ...EMPTY_BASE_ITEM,
  playStatus: "playing",
  platform: "",
  hoursPlayed: "",
  rating: null,
  finishedOn: "",
};

/** Same rule as the database's `published_games_have_review`. */
export function gamePublishRules(data: z.output<typeof gameSchema>): FieldErrors<GameFields> {
  return data.postId ? {} : { postId: "A game needs its review article to be published." };
}

/**
 * Changing the play status: finishing a game fills "finished on" with today,
 * never overwriting a date. Dropping it leaves the date alone (it means
 * finished, not stopped). `today` is the admin's local date ("2026-10-04").
 */
export function withPlayStatus<T extends { playStatus: PlayStatus; finishedOn: string }>(game: T, status: PlayStatus, today: string): T {
  return { ...game, playStatus: status, finishedOn: status === "finished" && !game.finishedOn ? today : game.finishedOn };
}

export function gameToRow(data: z.output<typeof gameSchema>): Omit<TablesInsert<"games">, "status"> {
  return {
    ...baseToRow(data),
    play_status: data.playStatus,
    platform: data.platform || null,
    hours_played: data.hoursPlayed === "" ? null : Number(data.hoursPlayed),
    rating: data.rating,
    finished_on: data.finishedOn || null,
  };
}

export function gameFromRow(row: Tables<"games">): GameFields {
  return {
    ...baseFromRow(row),
    playStatus: isPlayStatus(row.play_status) ? row.play_status : "playing",
    platform: row.platform ?? "",
    hoursPlayed: row.hours_played === null ? "" : String(row.hours_played),
    rating: row.rating,
    finishedOn: row.finished_on ?? "",
  };
}

export const gameDefinition: ItemDefinition<GameFields, z.output<typeof gameSchema>> = {
  section,
  schema: gameSchema,
  publishRules: gamePublishRules,
  toRow: gameToRow,
  empty: EMPTY_GAME,
};
