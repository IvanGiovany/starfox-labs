"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// "Continue with Google". The browser starts the sign-in: Supabase keeps a
// secret code verifier in a cookie and sends the visitor to Google; Google
// sends them back to /auth/callback, which finishes it on the server
// (app/auth/callback/route.ts) and returns to `next`.
export function GoogleButton({ next }: { next: string }) {
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");

  // Back from Google's screen restores this page as it was ("Opening
  // Google…", disabled); make the button usable again.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setState("idle");
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  async function start() {
    setState("busy");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    // On success the page is already leaving for Google.
    if (error) setState("failed");
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={start}
        disabled={state === "busy"}
        autoComplete="off"
        className="button-secondary inline-flex items-center justify-center gap-3"
      >
        <GoogleLogo />
        {state === "busy" ? "Opening Google…" : "Continue with Google"}
      </button>
      {state === "failed" && (
        <p role="alert" className="text-sm text-danger">
          Google sign-in couldn&apos;t start. Try again, or use your email below.
        </p>
      )}
    </div>
  );
}

/** Google's "G", as its sign-in branding guidelines ask for. */
function GoogleLogo() {
  return (
    <svg className="size-[18px] shrink-0" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
