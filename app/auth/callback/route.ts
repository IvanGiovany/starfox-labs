import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeNextPath } from "@/lib/next-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Where Google sign-in comes back to:
//   /auth/callback?code=…&next=/writing/x
// The browser started the sign-in (components/google-button.tsx) and kept a
// secret "code verifier" in a cookie (PKCE). Here the server swaps the code
// from Google, plus that verifier, for a session, then goes back to the page.
// Cancelling on Google's screen, or any failure, lands on /login with a note.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
  }

  redirect(`/login?error=google&next=${encodeURIComponent(next)}`);
}
