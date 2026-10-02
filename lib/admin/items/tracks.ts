import { z } from "zod";
import type { Json, Tables, TablesInsert } from "@/lib/database.types";
import { isSnippetPath } from "../snippet-rules";
import {
  baseFromRow,
  baseItemShape,
  baseToRow,
  EMPTY_BASE_ITEM,
  optionalDate,
  optionalLink,
  optionalText,
  type BaseItemFields,
  type FieldErrors,
  type ItemDefinition,
} from "./item-form";
import { ITEM_SECTIONS } from "./sections";

// Music: what one song holds, its rules, and how it maps to the `tracks`
// table. A finished song needs its audio snippet and its article to be
// published; a song still in progress ("Now producing" on home) doesn't.

const section = ITEM_SECTIONS.music;

/**
 * Where else the song can be heard, stored together in the `links` column.
 * `hosts` catches a link pasted into the wrong box (it would show the wrong
 * icon); subdomains count, so open.spotify.com and music.youtube.com pass.
 * Bandcamp has none: artists can use their own domain there.
 */
export const TRACK_LINKS = {
  spotify: { field: "spotifyUrl", label: "Spotify", hosts: ["spotify.com", "spotify.link"] },
  soundcloud: { field: "soundcloudUrl", label: "SoundCloud", hosts: ["soundcloud.com", "snd.sc"] },
  bandcamp: { field: "bandcampUrl", label: "Bandcamp", hosts: null },
  youtube: { field: "youtubeUrl", label: "YouTube", hosts: ["youtube.com", "youtu.be"] },
  apple: { field: "appleMusicUrl", label: "Apple Music", hosts: ["apple.com"] },
} as const satisfies Record<string, { field: string; label: string; hosts: readonly string[] | null }>;

export type TrackLinkKey = keyof typeof TRACK_LINKS;
type TrackLinkField = (typeof TRACK_LINKS)[TrackLinkKey]["field"];

const LINK_KEYS = Object.keys(TRACK_LINKS) as TrackLinkKey[];

/** "https://open.spotify.com/track/…" is on "spotify.com"; "https://notspotify.com" isn't. */
export function isOnHost(url: string, hosts: readonly string[]): boolean {
  if (!URL.canParse(url)) return false;
  const host = new URL(url).hostname.toLowerCase();
  return hosts.some((h) => host === h || host.endsWith(`.${h}`));
}

function platformLink(key: TrackLinkKey) {
  const { label, hosts } = TRACK_LINKS[key];
  return optionalLink.refine((url) => url === "" || hosts === null || isOnHost(url, hosts), `That isn't a ${label} link.`);
}

export const trackSchema = z.object({
  ...baseItemShape(section),
  inProgress: z.boolean(),
  releasedOn: optionalDate,
  snippetPath: z
    .string()
    .trim()
    .refine((path) => path === "" || isSnippetPath(path), "Add the snippet here (upload an MP3 or M4A), so we keep our own copy."),
  // Measured when the snippet is uploaded (see the snippet_seconds migration). Checked
  // below, on the snippet field, since it has no input of its own.
  snippetSeconds: z.number().nullable(),
  fullTrackUrl: optionalLink,
  spotifyUrl: platformLink("spotify"),
  soundcloudUrl: platformLink("soundcloud"),
  bandcampUrl: platformLink("bandcamp"),
  youtubeUrl: platformLink("youtube"),
  appleMusicUrl: platformLink("apple"),
  note: optionalText(500),
})
  // Same range as the database's check on snippet_seconds.
  .refine((track) => track.snippetSeconds === null || (track.snippetSeconds > 0 && track.snippetSeconds <= 31), {
    path: ["snippetPath"],
    message: "The snippet's length didn't come through right. Add it again.",
  });

export type TrackFields = BaseItemFields & {
  inProgress: boolean;
  releasedOn: string;
  snippetPath: string;
  /** The snippet's decoded length, saved at upload; null for older snippets. */
  snippetSeconds: number | null;
  fullTrackUrl: string;
  note: string;
} & Record<TrackLinkField, string>;

export const EMPTY_TRACK: TrackFields = {
  ...EMPTY_BASE_ITEM,
  inProgress: false,
  releasedOn: "",
  snippetPath: "",
  snippetSeconds: null,
  fullTrackUrl: "",
  spotifyUrl: "",
  soundcloudUrl: "",
  bandcampUrl: "",
  youtubeUrl: "",
  appleMusicUrl: "",
  note: "",
};

/** Same rule as the database's `published_tracks_have_article_and_snippet`, one message per missing field. */
export function trackPublishRules(data: z.output<typeof trackSchema>): FieldErrors<TrackFields> {
  if (data.inProgress) return {};
  const errors: FieldErrors<TrackFields> = {};
  if (!data.snippetPath) errors.snippetPath = "A finished song needs its audio snippet to be published. (A song in progress doesn't.)";
  if (!data.postId) errors.postId = "A finished song needs its article to be published. (A song in progress doesn't.)";
  return errors;
}

/** The platform links as stored: only the ones filled in, e.g. { spotify: "https://…" }. */
export function linksToJson(data: Record<TrackLinkField, string>): Partial<Record<TrackLinkKey, string>> {
  const links: Partial<Record<TrackLinkKey, string>> = {};
  for (const key of LINK_KEYS) {
    const url = data[TRACK_LINKS[key].field];
    if (url) links[key] = url;
  }
  return links;
}

/** Back from the `links` column; anything that isn't a known key with a text value is ignored. */
export function linksFromJson(links: Json): Record<TrackLinkField, string> {
  const stored = links && typeof links === "object" && !Array.isArray(links) ? links : {};
  return Object.fromEntries(
    LINK_KEYS.map((key) => {
      const value = stored[key];
      return [TRACK_LINKS[key].field, typeof value === "string" ? value : ""];
    }),
  ) as Record<TrackLinkField, string>;
}

export function trackToRow(data: z.output<typeof trackSchema>): Omit<TablesInsert<"tracks">, "status"> {
  return {
    ...baseToRow(data),
    in_progress: data.inProgress,
    released_on: data.releasedOn || null,
    snippet_path: data.snippetPath || null,
    // Rounded like the column (numeric(5, 2)); no snippet, no length.
    snippet_seconds: data.snippetPath && data.snippetSeconds !== null ? Math.round(data.snippetSeconds * 100) / 100 : null,
    full_track_url: data.fullTrackUrl || null,
    links: linksToJson(data),
    note: data.note || null,
  };
}

export function trackFromRow(row: Tables<"tracks">): TrackFields {
  return {
    ...baseFromRow(row),
    inProgress: row.in_progress,
    releasedOn: row.released_on ?? "",
    snippetPath: row.snippet_path ?? "",
    snippetSeconds: row.snippet_seconds,
    fullTrackUrl: row.full_track_url ?? "",
    ...linksFromJson(row.links),
    note: row.note ?? "",
  };
}

export const trackDefinition: ItemDefinition<TrackFields, z.output<typeof trackSchema>> = {
  section,
  schema: trackSchema,
  publishRules: trackPublishRules,
  toRow: trackToRow,
  empty: EMPTY_TRACK,
};
