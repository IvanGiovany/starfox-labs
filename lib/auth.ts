import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseServerClient } from "./supabase/server";

// The one place that decides who is signed in and who is an admin.
// Every admin page and every admin action goes through requireAdmin(); the
// database enforces the same rule again with RLS (public.is_admin()).

export type CurrentUser = { id: string; email: string | null };

/** The signed-in visitor, or null. Verified, not just read from the cookie. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;
  return { id: data.claims.sub, email: typeof data.claims.email === "string" ? data.claims.email : null };
});

/** Asks the database, so it can't disagree with the RLS policies. */
export const isAdmin = cache(async (): Promise<boolean> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
});

/**
 * Returns the admin, or sends everyone else away:
 * not signed in → /login; signed in but not an admin → /login with a message.
 */
export async function requireAdmin(next = "/admin"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!(await isAdmin())) redirect("/login?error=not-admin");
  return user;
}
