"use server";

import { redirect } from "next/navigation";
import { emailReturnAddress, safeNextPath } from "@/lib/next-path";
import { site } from "@/lib/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState =
  | { step: "email"; error?: string }
  | { step: "code"; email: string; next: string; error?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The login form's single action. The submitted fields say which step this is:
 * an email (send the email), a code (sign in), or "restart" (back to step 1).
 */
export async function loginAction(prev: LoginState, formData: FormData): Promise<LoginState> {
  if (formData.has("restart")) return { step: "email" };
  if (formData.has("code")) return verifySignInCode(prev, formData);
  return sendSignInEmail(prev, formData);
}

/**
 * Step 1: email a sign-in link and a one-time code. A new email address gets
 * an account (readers, Phase 4); being an admin is decided elsewhere
 * (public.admins), never by signing in.
 */
async function sendSignInEmail(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNextPath(String(formData.get("next") ?? ""));
  if (!EMAIL.test(email)) return { step: "email", error: "Enter a valid email address." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // The email's link brings this back as `next` (see app/auth/confirm).
      emailRedirectTo: emailReturnAddress(next, site.url),
    },
  });

  if (error?.code === "over_email_send_rate_limit") {
    return { step: "email", error: "Too many emails sent. Wait a minute, then try again." };
  }
  if (error) {
    return { step: "email", error: "The email couldn't be sent. Try again in a moment." };
  }
  return { step: "code", email, next };
}

/** Step 2: sign in with the code from the email. */
async function verifySignInCode(prev: LoginState, formData: FormData): Promise<LoginState> {
  if (prev.step !== "code") return { step: "email" };
  const token = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6,10}$/.test(token)) return { ...prev, error: "Enter the code from the email (numbers only)." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email: prev.email, token, type: "email" });
  if (error) return { ...prev, error: "That code is wrong or has expired. Check the latest email, or send a new one." };

  // `prev` comes back from the browser, so re-check `next` before trusting it.
  redirect(safeNextPath(prev.next));
}

/** Sign out in this browser only (other devices stay signed in), then go home. */
export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}
