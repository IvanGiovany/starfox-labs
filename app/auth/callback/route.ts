import { redirect } from "next/navigation";
import { after, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isNewGoogleSignUp } from "@/lib/avatars";
import { copyGooglePicture } from "@/lib/google-picture";
import { safeNextPath } from "@/lib/next-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Where Google comes back to, after signing in or after linking Google in
// Settings:
//   /auth/callback?code=…&next=/writing/x
// The browser started it (components/google-button.tsx, or linkIdentity in
// Settings) and kept a secret "code verifier" in a cookie (PKCE). Here the
// server swaps the code from Google, plus that verifier, for a session, then
// goes back to the page.
//
// A failure (or cancelling on Google's screen) lands on /login with a note,
// or, for someone already signed in (linking Google), back on the page with
// ?error=google.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // A brand-new Google account gets its Google picture, copied once.
      // after(): it runs once the redirect has been sent, so it never slows
      // the sign-in down.
      if (isNewGoogleSignUp(data.user)) {
        const picture = data.user.user_metadata?.avatar_url ?? data.user.user_metadata?.picture;
        const { id: userId } = data.user;
        const { access_token: accessToken } = data.session;
        after(() =>
          copyGooglePicture({ userId, accessToken, picture }).catch((reason) =>
            console.error("Copying the Google picture failed:", reason),
          ),
        );
      }
      redirect(next);
    }
  }

  if (await getCurrentUser()) {
    const back = new URL(next, request.nextUrl.origin);
    back.searchParams.set("error", "google");
    redirect(back.pathname + back.search + back.hash);
  }
  redirect(`/login?error=google&next=${encodeURIComponent(next)}`);
}
