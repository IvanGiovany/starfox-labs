"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminAccount, requireUser } from "@/lib/auth";
import { AVATARS_BUCKET } from "@/lib/avatars";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Settings → Account. No service key: everything runs as the signed-in person,
// so the database's rules apply (their own folder, their own profile, and
// delete_my_account() refuses the admin).

/** Signs this account out everywhere: every device's session ends, this one too. */
export async function signOutEverywhere() {
  await requireUser("/settings/account");
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?notice=signed-out-everywhere");
}

export type DeleteState = { error?: string };

/**
 * Deletes the signed-in account, in an order that never leaves a public file
 * behind (Supabase won't let SQL delete Storage files, so they go first):
 *   1. check the typed username (the form checks it too) and refuse the admin
 *   2. clear the profile's picture, then delete every file in the account's
 *      avatars folder (strays too, not just the current picture)
 *   3. delete_my_account(): the sign-in, and with it the profile
 *   4. clear the session cookies, then /goodbye
 * Any failure stops there with "try again"; a retry finishes the job.
 */
export async function deleteAccount(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const user = await requireUser("/settings/account");
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
  if (!profile || String(formData.get("confirm") ?? "").trim() !== profile.username) {
    return { error: "Type your username exactly as shown to confirm." };
  }
  if (await isAdminAccount()) return { error: "The admin account can't be deleted here." };

  const retry = "Your account couldn't be deleted. Nothing is lost; try again in a moment.";
  const { error: clearError } = await supabase.from("profiles").update({ avatar_path: null }).eq("id", user.id);
  if (clearError) return { error: retry };

  const { data: files, error: listError } = await supabase.storage.from(AVATARS_BUCKET).list(user.id, { limit: 1000 });
  if (listError) return { error: retry };
  const paths = (files ?? []).filter((file) => file.id).map((file) => `${user.id}/${file.name}`);
  if (paths.length) {
    const { error: removeError } = await supabase.storage.from(AVATARS_BUCKET).remove(paths);
    if (removeError) return { error: retry };
  }

  const { error: deleteError } = await supabase.rpc("delete_my_account");
  if (deleteError) return { error: retry };

  // The sign-in is gone; drop this browser's session cookies too. signOut
  // clears them even though the server no longer knows the account; anything
  // left over (sb-…) is removed by hand.
  await supabase.auth.signOut({ scope: "local" });
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith("sb-")) cookieStore.delete(cookie.name);
  }
  redirect("/goodbye");
}
