import type { MediaFolder } from "@/lib/media";
import { ImageError, type ImageUse } from "./image-rules";
import { importImageFromUrl } from "./import-image";
import { prepareImage } from "./prepare-image";
import { uploadImage, type UploadedImage } from "./upload-image";
import { UploadError } from "./upload-media";

// The two ways an image gets into an article or item, as one small API:
//   - a file (pasted, dropped or picked): prepared in the browser, then uploaded
//   - a link: imported by the server, which keeps our own copy
// Either way the result is our own copy in the section's media folder.

export type AddedImage = UploadedImage;

export async function addImageFile(file: Blob, use: ImageUse, folder: MediaFolder): Promise<AddedImage> {
  return uploadImage(await prepareImage(file, use), folder);
}

export function addImageFromUrl(url: string, use: ImageUse, folder: MediaFolder): Promise<AddedImage> {
  return importImageFromUrl(url, use, folder);
}

/** Messages from our own checks are already plain sentences; anything else gets a generic one. */
export function imageErrorMessage(error: unknown): string {
  return error instanceof ImageError || error instanceof UploadError ? error.message : "Something went wrong with that image. Try again.";
}

/** A single http(s) link, e.g. pasted from "Copy image address". */
export function looksLikeImageLink(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text.trim());
}

/** Image files from a paste or drop (screenshots, copied images, files from the desktop). */
export function imageFilesFrom(data: DataTransfer | null): File[] {
  return Array.from(data?.files ?? []).filter((file) => file.type.startsWith("image/"));
}
