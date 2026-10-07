"use server";

import { isAdmin, requireUser } from "@/lib/auth";
import { AVATARS_BUCKET, isOwnAvatarPath } from "@/lib/avatars";
import {
  displayNameProblem,
  normaliseUsername,
  profileSaveError,
  usernameProblem,
  type ProfileFieldErrors,
} from "@/lib/profile-rules";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Settings → Profile. Each action checks who's signed in first; the database
// then applies its own rules (only your own profile, three columns, reserved
// names, unique usernames), so these checks are for clear messages, not for
// safety.

export type ProfileState = {
  status: "idle" | "saved" | "error";
  values: { displayName: string; username: string };
  errors?: ProfileFieldErrors & { form?: string };
};

export async function saveProfile(prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser("/settings");
  const values = {
    displayName: String(formData.get("displayName") ?? "").trim(),
    username: normaliseUsername(String(formData.get("username") ?? "")),
  };

  const admin = await isAdmin();
  const errors: ProfileFieldErrors = {};
  const nameProblem = displayNameProblem(values.displayName, admin);
  const userProblem = usernameProblem(values.username, admin);
  if (nameProblem) errors.displayName = nameProblem;
  if (userProblem) errors.username = userProblem;
  if (nameProblem || userProblem) return { status: "error", values, errors };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: values.displayName, username: values.username })
    .eq("id", user.id);
  if (error) return { status: "error", values, errors: profileSaveError(error) };
  return { status: "saved", values };
}

export type PictureResult = { error?: string };

/**
 * Points the profile at a picture the browser has just uploaded to the
 * account's own folder, then deletes the old one.
 */
export async function savePicture(path: string): Promise<PictureResult> {
  const user = await requireUser("/settings");
  if (typeof path !== "string" || !isOwnAvatarPath(path, user.id)) return { error: "That picture couldn't be saved." };

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).single();
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
  if (error) return { error: "That picture couldn't be saved. Try again." };

  if (before?.avatar_path && before.avatar_path !== path) await removeFile(supabase, before.avatar_path);
  return {};
}

/** Removes the profile picture (the file too). */
export async function removePicture(): Promise<PictureResult> {
  const user = await requireUser("/settings");
  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).single();
  const { error } = await supabase.from("profiles").update({ avatar_path: null }).eq("id", user.id);
  if (error) return { error: "The picture couldn't be removed. Try again." };

  if (before?.avatar_path) await removeFile(supabase, before.avatar_path);
  return {};
}

/** Best effort: a leftover file is harmless (unlisted), a failed save isn't. */
async function removeFile(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, path: string) {
  const { error } = await supabase.storage.from(AVATARS_BUCKET).remove([path]);
  if (error) console.error("Removing an old profile picture failed:", path, error.message);
}
