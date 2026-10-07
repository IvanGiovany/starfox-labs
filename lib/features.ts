// Switches for things that are built but not live yet. NEXT_PUBLIC_ values are
// fixed when the site is built, so a switch that's off costs nothing.

/**
 * The end-of-article sign-up prompt (Phase 4 step 5). Off until comments
 * arrive in Phase 5 (Ivan, 2026-10-07): an account gives readers little before
 * that. NEXT_PUBLIC_SIGN_UP_PROMPT=on in .env.local turns it on in a local
 * build to try it; it isn't set on Vercel.
 *
 * Phase 5: switch it on here, and add the prompt's browser memory to /privacy.
 */
export const SIGN_UP_PROMPT = process.env.NEXT_PUBLIC_SIGN_UP_PROMPT === "on";
