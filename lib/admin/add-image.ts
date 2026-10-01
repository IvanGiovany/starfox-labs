import { ImageError, type ImageUse } from "./image-rules";
import { importImageFromUrl } from "./import-image";
import { prepareImage } from "./prepare-image";
import { uploadImage } from "./upload-image";

// The two ways an image gets into an article, as one small API for the
// editor's cover field and body:
//   - a file (pasted, dropped or picked): prepared in the browser, then uploaded
//   - a link: imported by the server, which keeps our own copy
// Either way the result is a URL in our media bucket.

export type AddedImage = { url: string; width: number; height: number };

export async function addImageFile(file: Blob, use: ImageUse): Promise<AddedImage> {
  return uploadImage(await prepareImage(file, use));
}

export function addImageFromUrl(url: string, use: ImageUse): Promise<AddedImage> {
  return importImageFromUrl(url, use);
}

/** Messages from our own checks are already plain sentences; anything else gets a generic one. */
export function imageErrorMessage(error: unknown): string {
  return error instanceof ImageError ? error.message : "Something went wrong with that image. Try again.";
}

/** A single http(s) link, e.g. pasted from "Copy image address". */
export function looksLikeImageLink(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text.trim());
}

/** Image files from a paste or drop (screenshots, copied images, files from the desktop). */
export function imageFilesFrom(data: DataTransfer | null): File[] {
  return Array.from(data?.files ?? []).filter((file) => file.type.startsWith("image/"));
}
