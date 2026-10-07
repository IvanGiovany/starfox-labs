// The rules for a profile's username and display name, for the Settings form
// (checked as you type) and its server action. The database has the final say
// (migration 20261007140000: checks, unique username, reserved names); these
// mirror it so people get a clear message before anything is sent.

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const DISPLAY_NAME_MAX = 40;

/**
 * Names only the admin may use. Keep in step with public.is_reserved_name():
 * compared without case, spaces or punctuation ("G-Van" counts as "gvan").
 */
const RESERVED_EXACT = [
  "admin", "administrator", "ivan", "moderator", "mod", "staff", "support",
  "official", "root", "system", "deleted", "deleteduser", "anonymous", "null",
];
const RESERVED_PARTS = ["gvan", "starfox", "spektral"];

export function isReservedName(name: string): boolean {
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return RESERVED_EXACT.includes(n) || RESERVED_PARTS.some((part) => n.includes(part));
}

/** Usernames are lowercase: "Ada_L " becomes "ada_l". */
export function normaliseUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** What's wrong with a username (already normalised), or null. `isAdmin` may use reserved names. */
export function usernameProblem(username: string, isAdmin = false): string | null {
  if (!USERNAME_PATTERN.test(username)) return "Use 3–20 lowercase letters, numbers or _.";
  if (!isAdmin && isReservedName(username)) return "That username is reserved.";
  return null;
}

/** What's wrong with a display name (already trimmed), or null. */
export function displayNameProblem(name: string, isAdmin = false): string | null {
  if (name.length === 0) return "Enter a name.";
  if (name.length > DISPLAY_NAME_MAX) return `Keep it to ${DISPLAY_NAME_MAX} characters.`;
  if (!isAdmin && isReservedName(name)) return "That name is reserved.";
  return null;
}

export type ProfileFieldErrors = { displayName?: string; username?: string };

/**
 * Turns the database's refusal into a message for the right field. Postgres
 * codes: 23505 unique (the username is taken), 23514 a check (a reserved name,
 * or a rule the form should already have caught).
 */
export function profileSaveError(error: { code?: string; message?: string }): ProfileFieldErrors & { form?: string } {
  if (error.code === "23505") return { username: "That username is taken." };
  if (error.code === "23514") {
    if (error.message?.includes("reserved")) return { form: "That name is reserved." };
    if (error.message?.includes("username")) return { username: "Use 3–20 lowercase letters, numbers or _." };
    if (error.message?.includes("display_name")) return { displayName: `Use 1–${DISPLAY_NAME_MAX} characters.` };
  }
  return { form: "Your profile couldn't be saved. Try again in a moment." };
}
