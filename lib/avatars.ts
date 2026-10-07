import { randomId } from "./media";
import { supabaseUrl } from "./supabase/config";

// Profile pictures live in the public "avatars" bucket, one folder per
// account: avatars/<user id>/<random>.webp. A new picture gets a new name, so
// it can be cached for a year and the old one is deleted (Settings → Profile).

export const AVATARS_BUCKET = "avatars";

/** The picture's public address, or null when there's no picture. */
export function avatarUrl(path: string | null | undefined): string | null {
  return path ? `${supabaseUrl}/storage/v1/object/public/${AVATARS_BUCKET}/${path}` : null;
}

/** Where a new picture goes: the owner's own folder, a random name. */
export function newAvatarPath(userId: string, extension: string): string {
  return `${userId}/${randomId()}.${extension}`;
}

/** A path this account may point its profile at: its own folder, a name we'd make. */
export function isOwnAvatarPath(path: string, userId: string): boolean {
  const [folder, name, ...rest] = path.split("/");
  return folder === userId && rest.length === 0 && /^[0-9a-f]{32}\.(webp|jpg|png)$/.test(name ?? "");
}

/** The first letter of a name for a picture-less avatar (whole characters, so an emoji stays intact). */
export function initialOf(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? "?";
}

// ── Google sign-ups ──────────────────────────────────────────────────────────

/** A Google picture is copied only for an account this new (Ivan: only at sign-up). */
const NEW_ACCOUNT_MS = 10 * 60 * 1000;

/**
 * Whether this sign-in is a brand-new Google account, whose picture should be
 * copied. Signing in with Google later, or linking Google to an older account,
 * never brings a picture (so a removed picture stays removed).
 */
export function isNewGoogleSignUp(
  user: { app_metadata?: { provider?: string }; created_at?: string },
  now = Date.now(),
): boolean {
  const created = Date.parse(user.created_at ?? "");
  return user.app_metadata?.provider === "google" && Number.isFinite(created) && now - created < NEW_ACCOUNT_MS;
}

/**
 * The address to copy a Google profile picture from, or null if it isn't one.
 * Only https on Google's picture host (the server fetches it, so nothing
 * else). Google's addresses end in a size like "=s96-c"; ask for 512 px.
 */
export function googlePictureUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 2048) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.port || url.username || url.password) return null;
  if (!url.hostname.endsWith(".googleusercontent.com")) return null;
  url.pathname = url.pathname.replace(/=s\d+(-c)?$/, "") + "=s512-c";
  return url.href;
}
