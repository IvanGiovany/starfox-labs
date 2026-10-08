import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { adminAccess, TWO_FACTOR_SETUP_PATH, twoFactorPath, type AdminAccess } from "./admin-access";
import { createSupabaseServerClient } from "./supabase/server";

// The one place that decides who is signed in and who is an admin.
// Every admin page and every admin action goes through requireAdmin(); the
// database enforces the same rule again with RLS (public.is_admin()).
//
// Two questions, kept apart since two-factor sign-in (Phase 6):
//   - isAdminAccount(): is this the admin's account? Identity: it may keep the
//     reserved name "gvan", it can't be deleted from Settings, its header menu
//     shows Admin. No code needed.
//   - isAdmin() / requireAdmin(): may it use admin powers right now? Also needs
//     a two-factor session (aal2) once a factor is set up (lib/admin-access.ts).

export type CurrentUser = { id: string; email: string | null; aal: string | null };

/** The signed-in visitor, or null. Verified, not just read from the cookie. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;
  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    aal: typeof data.claims.aal === "string" ? data.claims.aal : null,
  };
});

/**
 * Is the signed-in visitor the admin's account? Asks the database.
 * (Part B: public.is_admin_account(), when is_admin() starts requiring aal2.)
 */
export const isAdminAccount = cache(async (): Promise<boolean> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
});

/** Has the signed-in visitor a verified authenticator? (Asks Supabase Auth, not the cookie.) */
export const hasVerifiedFactor = cache(async (): Promise<boolean> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  return !error && (data?.totp.length ?? 0) > 0; // totp lists verified factors only
});

/** Where the signed-in visitor stands with the admin (see lib/admin-access.ts). */
export const getAdminAccess = cache(async (): Promise<AdminAccess> => {
  const user = await getCurrentUser();
  if (!user) return "signed-out";
  const adminAccount = await isAdminAccount();
  const hasFactor = adminAccount && user.aal !== "aal2" ? await hasVerifiedFactor() : false;
  return adminAccess({ signedIn: true, adminAccount, aal: user.aal, hasFactor });
});

/** May the visitor use admin powers right now? For route handlers, which answer 401 instead of redirecting. */
export async function isAdmin(): Promise<boolean> {
  return (await getAdminAccess()) === "ok";
}

/** Returns the signed-in visitor, or sends them to sign in and back to `next` (Settings). */
export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/**
 * Returns the admin, or sends everyone else away: not signed in → /login;
 * signed in but not the admin → /login with a message; the admin without the
 * two-factor code → the code screen; (once required) without two-factor
 * sign-in at all → its setup in Settings.
 */
export async function requireAdmin(next = "/admin"): Promise<CurrentUser> {
  const access = await getAdminAccess();
  if (access === "signed-out") redirect(`/login?next=${encodeURIComponent(next)}`);
  if (access === "not-admin") redirect("/login?error=not-admin");
  if (access === "needs-code") redirect(twoFactorPath(next));
  if (access === "needs-setup") redirect(TWO_FACTOR_SETUP_PATH);
  return (await getCurrentUser())!;
}
