import { withSize } from "@/lib/image-size";
import { mediaPath, type MediaFolder } from "@/lib/media";
import type { PreparedImage } from "@/lib/images/prepare";
import { uploadToMedia } from "./upload-media";

// Uploads a prepared image to the public "media" bucket, into its section's
// folder. Returns the stored path (what items save) and the URL (what articles
// save), the URL with the image's size in the fragment (…/abc.webp#2400x1600).

export type UploadedImage = { path: string; url: string; width: number; height: number };

export async function uploadImage(image: PreparedImage, folder: MediaFolder): Promise<UploadedImage> {
  const path = mediaPath(folder, image.extension);
  const publicUrl = await uploadToMedia(path, image.blob, image.type);
  return { path, url: withSize(publicUrl, image.width, image.height), width: image.width, height: image.height };
}
