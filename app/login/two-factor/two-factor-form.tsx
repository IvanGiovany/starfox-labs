"use client";

import { useId, useRef, useState } from "react";
import { TwoFactorCodeInput, twoFactorError } from "@/components/two-factor-code";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// Sends the code as soon as it's complete. The browser client stores the
// raised (aal2) session in the cookie, then a full page load opens `next`, so
// the server reads the new session from the start.
export function TwoFactorForm({ factorId, next }: { factorId: string; next: string }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  async function verify(value: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error } = await createSupabaseBrowserClient().auth.mfa.challengeAndVerify({ factorId, code: value });
    if (!error) {
      window.location.replace(next);
      return; // stays "busy" while the next page loads
    }
    setBusy(false);
    setError(twoFactorError(error));
    setCode("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <form
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length === 6) verify(code);
      }}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-fg-muted">Code from your authenticator app</span>
        <TwoFactorCodeInput
          ref={inputRef}
          value={code}
          onChange={setCode}
          onComplete={verify}
          disabled={busy}
          autoFocus
          describedBy={error ? errorId : undefined}
        />
      </label>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button type="submit" autoComplete="off" disabled={busy || code.length < 6} className="button-primary self-start">
        {busy ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}
