import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { nextFromLink } from "@/lib/next-path";
import { site } from "@/lib/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Where the link in the sign-in email lands:
//   /auth/confirm?token_hash=…&type=email&next=https://starfoxlabs.org/writing/x
// The sign-in is completed here on the server, so the link works in whichever
// browser the email app opens it in (unlike the default link, which only
// works in the browser that asked for it).
//
// `next` is the page to go back to. The email template fills it with
// Supabase's redirect address (a full URL, from the login form's
// emailRedirectTo), so a full URL on this site is accepted as well as a path.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = nextFromLink(searchParams.get("next"), [request.nextUrl.origin, new URL(site.url).origin]);

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(next);
  }

  redirect(`/login?error=link&next=${encodeURIComponent(next)}`);
}
