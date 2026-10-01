import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// Uploads a file from the browser straight to the public "media" bucket.
// Shared by images and audio snippets; each prepares and checks its own file
// first, and chooses the path (see mediaPath in lib/media.ts).

/** Upload problems as plain sentences the forms can show as they are. */
export class UploadError extends Error {}

/** Stores `file` at `path` and returns its public URL. */
export async function uploadToMedia(path: string, file: Blob, contentType: string): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage.from("media").upload(path, file, {
    contentType,
    // Every upload gets a new random name, so browsers and CDNs may keep it for a year.
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new UploadError(explainUploadError(error));
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
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
  if (codes.includes("413")) return "This file is too large to upload (the limit is 5 MB).";
  if (codes.includes("415")) return "Storage refused this type of file.";
  return "The upload didn't go through. Check your connection and try again.";
}
