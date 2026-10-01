import { supabaseUrl } from "@/lib/supabase/config";

// Files in the public "media" bucket: one folder per section. Articles store an
// image's full URL (cover_image_url, images in the body); items store its path
// inside the bucket (image_path, snippet_path), and pages build the URL here.

export const MEDIA_FOLDERS = ["writing", "projects", "books", "music", "games", "hobbies"] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

/** Public URLs of files in our media bucket start with this. */
export const MEDIA_URL_PREFIX = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/media/`;

/** "books/2026/10/abc.webp" → its public URL. */
export function mediaUrl(path: string): string {
  return MEDIA_URL_PREFIX + path;
}

/** A path inside one of our folders, e.g. "books/2026/10/abc.webp" (no "..", no leading slash). */
export function isMediaPath(path: string, folder?: MediaFolder): boolean {
  const folders = folder ? [folder] : MEDIA_FOLDERS;
  return folders.some((f) => path.startsWith(`${f}/`)) && /^[\w./-]+$/.test(path) && !path.includes("..");
}

/**
 * A random hex id. crypto.getRandomValues works everywhere, unlike
 * crypto.randomUUID, which browsers only offer on https:// or localhost (so it
 * would fail on the dev server opened from a phone at http://192.168.…).
 */
export function randomId(bytes = 16): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Where an uploaded file is stored in the media bucket: its section's folder,
 * then by month, with a random name. That works before a new article or item
 * is first saved, and two uploads can never overwrite each other.
 */
export function mediaPath(folder: MediaFolder, extension: string, now = new Date()): string {
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${folder}/${now.getUTCFullYear()}/${month}/${randomId()}.${extension}`;
}

/** Covers and other stored URLs must be our own copies, never links to other sites. */
export function isOwnMediaUrl(url: string): boolean {
  return url.startsWith(MEDIA_URL_PREFIX) && isMediaPath(url.slice(MEDIA_URL_PREFIX.length).split("#")[0]);
}
