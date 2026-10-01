import { withSize } from "@/lib/image-size";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ImageError, mediaPath } from "./image-rules";
import type { PreparedImage } from "./prepare-image";

// Uploads a prepared image to the public "media" bucket and returns its URL,
// with the image's size in the fragment (…/abc.webp#2400x1600) for the renderer.

export async function uploadImage(image: PreparedImage): Promise<{ url: string; width: number; height: number }> {
  const supabase = createSupabaseBrowserClient();
  const path = mediaPath(image.extension);

  const { error } = await supabase.storage.from("media").upload(path, image.blob, {
    contentType: image.type,
    // Every upload gets a new random name, so browsers and CDNs may keep it for a year.
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new ImageError(explainUploadError(error));

  const { publicUrl } = supabase.storage.from("media").getPublicUrl(path).data;
  return { url: withSize(publicUrl, image.width, image.height), width: image.width, height: image.height };
}

/**
 * Storage reports the HTTP status in `status` and its own code in `statusCode`;
 * a refused policy check, for example, arrives as HTTP 400 with statusCode "403".
 */
function explainUploadError(error: Error & { status?: unknown; statusCode?: unknown }): string {
  const codes = [String(error.status ?? ""), String(error.statusCode ?? "")];
  if (codes.includes("401") || codes.includes("403")) {
    return "Your sign-in has expired. Save your work, then reload to sign in again.";
  }
  if (codes.includes("413")) return "This image is too large to upload (the limit is 5 MB).";
  return "The upload didn't go through. Check your connection and try again.";
}
