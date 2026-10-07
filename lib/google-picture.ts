import "server-only";
import { createClient } from "@supabase/supabase-js";
import { AVATAR_CACHE_SECONDS, AVATARS_BUCKET, googlePictureUrl, newAvatarPath } from "./avatars";
import type { Database } from "./database.types";
import { fetchRemoteImage } from "./images/fetch-remote";
import { prepareAvatarOnServer } from "./images/prepare-server";
import { supabasePublishableKey, supabaseUrl } from "./supabase/config";

/**
 * Copies a new Google account's profile picture into our own storage, once
 * (app/auth/callback runs this after the sign-in redirect has been sent).
 * Never linked from Google: the picture is downloaded through the safe remote
 * fetch, cropped to a 512 px square WebP, and uploaded to the account's own
 * folder.
 *
 * It acts as the new user (their access token), never with the service key,
 * so the database's rules apply as for anything they do themselves. Best
 * effort: if anything fails, the account simply has no picture.
 */
export async function copyGooglePicture({
  userId,
  accessToken,
  picture,
}: {
  userId: string;
  accessToken: string;
  picture: unknown;
}): Promise<void> {
  const url = googlePictureUrl(picture);
  if (!url) return;

  const db = createClient<Database>(supabaseUrl, supabasePublishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile } = await db.from("profiles").select("avatar_path").eq("id", userId).single();
  if (!profile || profile.avatar_path) return;

  const downloaded = await fetchRemoteImage(url);
  const image = await prepareAvatarOnServer(downloaded.bytes);
  const path = newAvatarPath(userId, image.extension);
  const { error: uploadError } = await db.storage
    .from(AVATARS_BUCKET)
    .upload(path, image.bytes, { contentType: image.type, cacheControl: String(AVATAR_CACHE_SECONDS), upsert: false });
  if (uploadError) throw new Error(`upload: ${uploadError.message}`);

  // Only if there's still no picture (they might have picked one meanwhile).
  const { data: updated, error } = await db
    .from("profiles")
    .update({ avatar_path: path })
    .eq("id", userId)
    .is("avatar_path", null)
    .select("id");
  if (error || !updated?.length) {
    await db.storage.from(AVATARS_BUCKET).remove([path]);
    if (error) throw new Error(`profile: ${error.message}`);
  }
}
