import type { MediaFolder } from "@/lib/media";

// How every uploaded image is prepared, wherever the preparation runs: in the
// browser for pasted or dropped files (lib/admin/prepare-image.ts), on the
// server for "paste image URL" imports. One set of numbers, so both paths
// produce the same kind of file.

export type ImageUse = "body" | "cover";

export const IMAGE_RULES = {
  /** Longest edge in pixels. Smaller images are never enlarged. */
  maxEdge: { body: 2400, cover: 1200 } satisfies Record<ImageUse, number>,
  /** WebP (or the JPEG fallback) quality, 0–1. */
  quality: 0.85,
  /** The media bucket's own limit (see the media storage migration). */
  maxUploadBytes: 5 * 1024 * 1024,
  /** Formats we read. GIF and SVG are refused: animation would be lost, and SVG can carry scripts. */
  inputTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
} as const;

/** Plain-language errors the editor can show as they are. */
export class ImageError extends Error {}

export function checkInputType(type: string) {
  if ((IMAGE_RULES.inputTypes as readonly string[]).includes(type)) return;
  const name = type.replace(/^image\//, "").replace(/\+xml$/, "").toUpperCase() || "this file";
  throw new ImageError(
    type === "image/gif" || type === "image/svg+xml"
      ? `${name} images aren't supported. Use a JPEG, PNG, WebP or AVIF instead.`
      : `That isn't an image we can use (${name}). Use a JPEG, PNG, WebP or AVIF.`,
  );
}

/** The new size for an image: the longest edge capped at the limit for its use. */
export function fitWithin(width: number, height: number, use: ImageUse): { width: number; height: number } {
  const scale = Math.min(1, IMAGE_RULES.maxEdge[use] / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
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
