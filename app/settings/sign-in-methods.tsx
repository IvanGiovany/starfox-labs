"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// How this account can sign in. Email always works (a code sent to the
// account's address). Google can be linked (Supabase's manual identity
// linking: the browser goes to Google and comes back through /auth/callback)
// or unlinked, but only while another method remains: Supabase refuses to
// remove an account's last identity, and it would lock the person out.

export type Identity = { provider: string; email: string | null };

export function SignInMethods({
  email,
  identities,
  linkFailed,
}: {
  email: string | null;
  identities: Identity[];
  linkFailed: boolean;
}) {
  const router = useRouter();
  const google = identities.find((identity) => identity.provider === "google");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(
    linkFailed
      ? "Google couldn't be linked. If that Google account already has its own account here, it can't be linked to this one too."
      : null,
  );

  // Back from Google's screen restores this page as it was ("Opening
  // Google…", disabled); make the buttons usable again.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  async function link() {
    setError(null);
    setBusy(true);
    const { error: linkError } = await createSupabaseBrowserClient().auth.linkIdentity({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/settings` },
    });
    // On success the page is already leaving for Google.
    if (linkError) {
      setBusy(false);
      setError("Google couldn't be linked. Try again in a moment.");
    }
  }

  async function unlink() {
    setError(null);
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getUserIdentities();
    const identity = data?.identities.find((item) => item.provider === "google");
    const { error: unlinkError } = identity ? await supabase.auth.unlinkIdentity(identity) : { error: new Error("not linked") };
    setBusy(false);
    setConfirming(false);
    if (unlinkError) return setError("Google couldn't be unlinked. Try again in a moment.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-fg">
          Email <span className="text-fg-muted">· {email ?? "no address"}</span>
        </p>
        <p className="mt-1 text-sm text-fg-muted">You can always sign in with a code sent to this address.</p>
      </div>

      <div>
        <p className="text-fg">
          Google{" "}
          <span className="text-fg-muted">· {google ? `linked${google.email ? ` (${google.email})` : ""}` : "not linked"}</span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {!google && (
            <button type="button" onClick={link} disabled={busy} autoComplete="off" className="button-secondary">
              {busy ? "Opening Google…" : "Link Google"}
            </button>
          )}
          {google && identities.length >= 2 && !confirming && (
            <button type="button" onClick={() => setConfirming(true)} disabled={busy} autoComplete="off" className="button-secondary">
              Unlink Google
            </button>
          )}
          {google && confirming && (
            <>
              <span className="text-sm text-fg-muted">Sign in with email codes from now on?</span>
              <button type="button" onClick={unlink} disabled={busy} autoComplete="off" className="button-primary">
                {busy ? "Unlinking…" : "Unlink"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} disabled={busy} autoComplete="off" className="button-secondary">
                Keep it
              </button>
            </>
          )}
          {google && identities.length < 2 && (
            <p className="text-sm text-fg-muted">
              Google is your only sign-in method so far. To unlink it, sign in once with an email code first.
            </p>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
