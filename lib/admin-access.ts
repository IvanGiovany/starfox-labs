// Who may use the admin, as one pure decision (lib/auth.ts gathers the facts;
// unit tests cover the rules). Being the admin *account* is identity (a row in
// public.admins). Admin *powers* also need a two-factor session (aal2).

/**
 * Admin powers require two-factor sign-in (since Phase 6 step 1 part B, with
 * migration 20261008120000, which makes public.is_admin() require aal2): an
 * admin account without it is sent to set it up in Settings → Account.
 */
export const TWO_FACTOR_REQUIRED = true;

export type AdminAccess = "signed-out" | "not-admin" | "needs-setup" | "needs-code" | "ok";

export function adminAccess(facts: {
  signedIn: boolean;
  adminAccount: boolean;
  /** The session's assurance level: aal2 after a two-factor code. */
  aal: string | null;
  hasFactor: boolean;
  required?: boolean;
}): AdminAccess {
  const { signedIn, adminAccount, aal, hasFactor, required = TWO_FACTOR_REQUIRED } = facts;
  if (!signedIn) return "signed-out";
  if (!adminAccount) return "not-admin";
  if (aal === "aal2") return "ok";
  if (hasFactor) return "needs-code";
  return required ? "needs-setup" : "ok";
}

/** The code screen, coming back to `next` afterwards. */
export function twoFactorPath(next: string): string {
  return `/login/two-factor?next=${encodeURIComponent(next)}`;
}

/** Where an admin account without two-factor sign-in sets it up. */
export const TWO_FACTOR_SETUP_PATH = "/settings/account#two-factor";
