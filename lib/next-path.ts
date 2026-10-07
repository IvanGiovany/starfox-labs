// Where to send someone after signing in ("?next="). Plain functions, so the
// server, the browser (the Google button) and unit tests can all use them.

/**
 * Only allow paths on this site ("/writing/x", not "//evil.com" or
 * "https://…"), so a crafted ?next= link can't send someone elsewhere.
 * Backslashes and control characters are refused too: browsers drop tabs and
 * newlines inside URLs and read "\" as "/", so "/\t/evil.com" would become
 * "//evil.com". The sign-in pages themselves are never a destination (that
 * would loop: signed in → /login → already signed in → /login …).
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  if (/^\/(login|auth)(?=[/?#]|$)/.test(next)) return fallback;
  return next;
}

/**
 * The `next` that comes back through a sign-in email: a path, or a full URL
 * (the email's link carries Supabase's redirect address). A full URL counts
 * only on one of `origins` (this site), and becomes its path.
 */
export function nextFromLink(value: string | null | undefined, origins: string[], fallback = "/"): string {
  if (!value) return fallback;
  if (value.startsWith("/")) return safeNextPath(value, fallback);
  try {
    const url = new URL(value);
    if (!origins.includes(url.origin)) return fallback;
    return safeNextPath(url.pathname + url.search + url.hash, fallback);
  } catch {
    return fallback;
  }
}

/**
 * The address a sign-in email should bring someone back to: the page's path
 * only, on the site's own address. Query strings are dropped: the email's
 * link puts this address inside its own query string, where an "&" would
 * break it.
 */
export function emailReturnAddress(next: string, siteUrl: string): string {
  const path = safeNextPath(next).split(/[?#]/)[0];
  return new URL(path, siteUrl).href;
}
