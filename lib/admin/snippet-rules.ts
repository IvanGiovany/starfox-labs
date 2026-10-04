import { formatDuration } from "@/lib/format";
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

/** The snippet cutter: a snippet cut in the browser from the full track. */
export const CUT_RULES = {
  /** Seconds. Ivan picks the length in whole seconds; it starts at the longest. */
  minSeconds: 20,
  maxSeconds: SNIPPET_RULES.maxSeconds,
  fadeInSeconds: 0.5,
  fadeOutSeconds: 2,
  /** The track is decoded at this rate and the snippet encoded at it: CD quality, MP3's usual rate. */
  sampleRate: 44_100,
  kbps: 320,
  /**
   * The full track stays on the device. A decoded stereo minute takes about 21 MB
   * of memory, so these keep a phone comfortable (a 3-minute MP3 is about 7 MB).
   */
  maxTrackBytes: 200 * 1024 * 1024,
  maxTrackSeconds: 15 * 60,
} as const;

/** "music/2026/10/abc.mp3": our own MP3 or M4A in the music folder. */
export function isSnippetPath(path: string): boolean {
  return isMediaPath(path, "music") && /\.(mp3|m4a)$/.test(path);
}

/** Problems with a snippet file, as plain sentences the form can show. */
export class SnippetError extends Error {}

// What systems report for these files: Chrome says audio/mpeg and audio/x-m4a,
// Safari audio/mp4, some say audio/mp3 or audio/m4a, and some send nothing.
const TYPE_TO_EXTENSION: Record<string, SnippetExtension> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
};

/**
 * Which kind of snippet a file is, from its name first (the reported type
 * varies by system), then its type; null if it's neither an MP3 nor an M4A.
 */
export function snippetExtension(file: { name: string; type: string }): SnippetExtension | null {
  const fromName = file.name.toLowerCase().match(/\.(mp3|m4a)$/)?.[1] as SnippetExtension | undefined;
  const fromType = TYPE_TO_EXTENSION[file.type.toLowerCase()];
  if (fromName) return !file.type || fromType || file.type.startsWith("audio/") ? fromName : null;
  return fromType ?? null;
}

/** Checks a file before it's read: type and size. Returns the extension to store it with. */
export function checkSnippetFile(file: { name: string; type: string; size: number }): SnippetExtension {
  const extension = snippetExtension(file);
  if (!extension) throw new SnippetError("That isn't an MP3 or M4A file. Export the snippet as one of those.");
  if (file.size > SNIPPET_RULES.maxBytes) {
    throw new SnippetError(`This file is ${formatBytes(file.size)}; a snippet can be at most 2 MB. Export it at a lower bitrate.`);
  }
  if (file.size === 0) throw new SnippetError("This file is empty.");
  return extension;
}

/** Checks the length read from the audio itself. */
export function checkSnippetDuration(seconds: number): void {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new SnippetError("Couldn't tell how long this file is. Try exporting it again.");
  if (seconds > SNIPPET_RULES.maxSeconds + SNIPPET_RULES.toleranceSeconds) {
    // Seconds with one decimal: rounded to "0:30", a 30.4 s clip would look allowed.
    const shown = seconds < 60 ? `${seconds.toFixed(1)} seconds` : formatDuration(seconds);
    throw new SnippetError(`This clip is ${shown} long; a snippet can be at most ${SNIPPET_RULES.maxSeconds} seconds.`);
  }
}

// Any audio the browser can decode will do for the full track; the name helps
// when a system reports the type wrongly or not at all.
const TRACK_EXTENSIONS = /\.(mp3|m4a|mp4|aac|wav|flac|ogg|oga|opus|webm|aif|aiff)$/i;

/** Checks the full track before it's decoded: that it's audio, and its size. */
export function checkTrackFile(file: { name: string; type: string; size: number }): void {
  if (file.type && !file.type.startsWith("audio/") && !TRACK_EXTENSIONS.test(file.name)) {
    throw new SnippetError("That isn't an audio file. Pick the song's MP3 or WAV export.");
  }
  if (file.size === 0) throw new SnippetError("This file is empty.");
  if (file.size > CUT_RULES.maxTrackBytes) {
    throw new SnippetError(`This file is ${formatBytes(file.size)}; the full track can be at most 200 MB. Export it as an MP3.`);
  }
}

/** Checks the full track's length, read by decoding it. */
export function checkTrackDuration(seconds: number): void {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new SnippetError("Couldn't tell how long this track is. Try exporting it again.");
  if (seconds < CUT_RULES.minSeconds) {
    throw new SnippetError(
      `This track is only ${seconds.toFixed(1)} seconds long; cutting needs at least ${CUT_RULES.minSeconds}. Upload it as a ready-made snippet instead.`,
    );
  }
  if (seconds > CUT_RULES.maxTrackSeconds) {
    throw new SnippetError(`This track is ${formatDuration(seconds)} long; the cutter takes up to 15 minutes. Export the part around the snippet.`);
  }
}

/** What Storage reports about a stored file, or null when there's no such file. */
export type StoredFile = { size?: number; contentType?: string } | null;

/**
 * The server's check of an uploaded snippet before a song is saved with it:
 * the file must exist, be stored as audio of the kind its name says, and fit
 * the size limit. Returns the problem as a sentence, or null if it's fine.
 * (Its length can't be checked without decoding it; the browser did that.)
 */
export function storedSnippetProblem(path: string, file: StoredFile): string | null {
  if (!file) return "The snippet file isn't in storage (the upload may not have finished). Add it again.";
  const extension = path.slice(path.lastIndexOf(".") + 1);
  const allowed = extension === "mp3" ? ["audio/mpeg"] : extension === "m4a" ? ["audio/mp4", "audio/x-m4a"] : [];
  if (!allowed.includes(file.contentType ?? "")) return "The stored snippet isn't an MP3 or M4A. Add it again.";
  if (file.size === undefined || file.size > SNIPPET_RULES.maxBytes) return "The stored snippet is larger than 2 MB. Add a smaller one.";
  return null;
}

// Lives in lib/format.ts (the public audio player uses it too); re-exported for the admin.
export { formatDuration };

/** 421_888 → "412 KB", 2_400_000 → "2.3 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
