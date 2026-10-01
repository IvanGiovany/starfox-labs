import { isMediaPath } from "@/lib/media";

// What a song's audio snippet may be, wherever it's checked: the snippet field
// (before uploading), the Music form's schema and the server's check of the
// uploaded file. The media bucket allows 5 MB for any file; snippets get less.

export const SNIPPET_RULES = {
  maxBytes: 2 * 1024 * 1024,
  /** Seconds. A ready-made snippet may be up to this long. */
  maxSeconds: 30,
  /** Encoders pad the end by a few milliseconds, so a "30 s" file can read 30.05 s. */
  toleranceSeconds: 0.3,
  /** The file types we take, with the content type each is stored as. */
  types: { mp3: "audio/mpeg", m4a: "audio/mp4" },
} as const;

export type SnippetExtension = keyof typeof SNIPPET_RULES.types;

/** "music/2026/10/abc.mp3": our own MP3 or M4A in the music folder. */
export function isSnippetPath(path: string): boolean {
  return isMediaPath(path, "music") && /\.(mp3|m4a)$/.test(path);
}
