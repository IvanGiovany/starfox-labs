"use client";

import { forwardRef } from "react";

// The 6-digit box for codes from an authenticator app (the code screen after
// signing in, and two-factor setup in Settings). Phones show the number pad
// and can offer the code themselves (one-time-code); spaces and other
// characters are dropped; the sixth digit sends it.

export const CODE_LENGTH = 6;

export const TwoFactorCodeInput = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (digits: string) => void;
    /** Called when the sixth digit arrives. */
    onComplete: (code: string) => void;
    disabled?: boolean;
    autoFocus?: boolean;
    describedBy?: string;
  }
>(function TwoFactorCodeInput({ value, onChange, onComplete, disabled, autoFocus, describedBy }, ref) {
  return (
    <input
      ref={ref}
      value={value}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
        onChange(digits);
        if (digits.length === CODE_LENGTH) onComplete(digits);
      }}
      disabled={disabled}
      autoFocus={autoFocus}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      aria-describedby={describedBy}
      className="field max-w-[12rem] font-mono text-lg tracking-[0.4em]"
    />
  );
});

/** Supabase's refusal, in a sentence. */
export function twoFactorError(error: { code?: string; status?: number } | null): string {
  if (error?.code === "mfa_verification_failed" || error?.code === "mfa_challenge_expired") {
    return "That code didn't work. Codes change every 30 seconds: try the current one.";
  }
  if (error?.status === 429 || error?.code === "over_request_rate_limit") {
    return "Too many tries. Wait a minute, then try again.";
  }
  return "Something went wrong. Check your connection and try again.";
}
