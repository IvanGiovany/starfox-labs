"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { LocalDateTime } from "@/components/local-date-time";
import { TwoFactorCodeInput, twoFactorError } from "@/components/two-factor-code";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// Two-factor sign-in for the admin account (Phase 6): an authenticator app on
// the phone gives a 6-digit code that every new sign-in to the admin asks for.
// One factor: the same QR code is scanned on the phone and on a backup device,
// so the code screen never has to ask which device. Setting it up, or turning
// it off, needs a current code; turning it off also needs this session to have
// passed the code (Supabase refuses otherwise), so the code is checked first.

type Step =
  | { kind: "off" }
  | { kind: "scan"; factorId: string; qr: string; secret: string }
  | { kind: "on"; since: string; factorId: string }
  | { kind: "turning-off"; since: string; factorId: string };

const ISSUER = "Starfox Labs"; // the name the authenticator app shows

export function TwoFactorSetup({ factor }: { factor: { id: string; createdAt: string } | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(factor ? { kind: "on", since: factor.createdAt, factorId: factor.id } : { kind: "off" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const mfa = () => createSupabaseBrowserClient().auth.mfa;

  async function start() {
    setBusy(true);
    setError(null);
    // A setup left half-done earlier would block a new one: clear it first.
    const { data: existing } = await mfa().listFactors();
    for (const f of existing?.all ?? []) {
      if (f.factor_type === "totp" && f.status === "unverified") await mfa().unenroll({ factorId: f.id });
    }
    const { data, error } = await mfa().enroll({ factorType: "totp", issuer: ISSUER, friendlyName: "Authenticator" });
    setBusy(false);
    if (error || !data) return setError("Setup couldn't start. Try again in a moment.");
    setCode("");
    setStep({ kind: "scan", factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function cancelSetup(factorId: string) {
    setBusy(true);
    await mfa().unenroll({ factorId });
    setBusy(false);
    setError(null);
    setStep({ kind: "off" });
  }

  async function turnOn(factorId: string, value: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error } = await mfa().challengeAndVerify({ factorId, code: value });
    setBusy(false);
    setCode("");
    if (error) return setError(twoFactorError(error));
    setStep({ kind: "on", since: new Date().toISOString(), factorId });
    router.refresh(); // the admin's banner and checks follow the new state
  }

  async function turnOff(factorId: string, value: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const verified = await mfa().challengeAndVerify({ factorId, code: value });
    if (verified.error) {
      setBusy(false);
      setCode("");
      return setError(twoFactorError(verified.error));
    }
    const { error } = await mfa().unenroll({ factorId });
    setBusy(false);
    setCode("");
    if (error) return setError("It couldn't be turned off. Try again.");
    setStep({ kind: "off" });
    router.refresh();
  }

  const errorNote = error && (
    <p id={errorId} role="alert" className="text-sm text-danger">
      {error}
    </p>
  );

  if (step.kind === "off") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-fg-muted">
          Off. With it on, signing in to the admin also asks for a 6-digit code from an app on your
          phone, so a stolen email or Google account alone can&apos;t publish or email subscribers.
        </p>
        {errorNote}
        <button type="button" onClick={start} disabled={busy} autoComplete="off" className="button-primary self-start">
          {busy ? "Starting…" : "Set up two-factor sign-in"}
        </button>
      </div>
    );
  }

  if (step.kind === "scan") {
    return (
      <div className="flex flex-col gap-5">
        <ol className="flex list-decimal flex-col gap-4 pl-5 text-fg-muted">
          <li>
            Open an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…) and
            scan this code. <span className="text-fg">Scan it with your backup device too</span>, so a
            lost phone doesn&apos;t lock you out.
            <span className="mt-3 block w-fit rounded-lg bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- an SVG data URL made by Supabase for this setup only */}
              <img src={step.qr} alt="QR code for your authenticator app" width={176} height={176} />
            </span>
            <span className="mt-3 block text-sm">
              Can&apos;t scan? Enter this key by hand:{" "}
              <code className="font-mono break-all text-fg select-all">{step.secret.match(/.{1,4}/g)?.join(" ")}</code>
            </span>
          </li>
          <li>
            <span className="block">Type the 6-digit code the app shows for {ISSUER}:</span>
            <span className="mt-2 block">
              <TwoFactorCodeInput
                value={code}
                onChange={setCode}
                onComplete={(value) => turnOn(step.factorId, value)}
                disabled={busy}
                describedBy={error ? errorId : undefined}
              />
            </span>
          </li>
        </ol>
        {errorNote}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => turnOn(step.factorId, code)}
            disabled={busy || code.length < 6}
            autoComplete="off"
            className="button-primary"
          >
            {busy ? "Checking…" : "Turn on"}
          </button>
          <button type="button" onClick={() => cancelSetup(step.factorId)} disabled={busy} autoComplete="off" className="row-action">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step.kind === "on") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-fg-muted">
          <span className="text-fg">On</span> since <LocalDateTime iso={step.since} />. Each new
          sign-in to the admin asks for a code from your authenticator app.
        </p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setCode("");
            setStep({ kind: "turning-off", since: step.since, factorId: step.factorId });
          }}
          autoComplete="off"
          className="row-action -ml-3 self-start"
        >
          Turn off…
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-fg-muted">To turn it off, type a current code from your authenticator app.</p>
      <TwoFactorCodeInput
        value={code}
        onChange={setCode}
        onComplete={(value) => turnOff(step.factorId, value)}
        disabled={busy}
        autoFocus
        describedBy={error ? errorId : undefined}
      />
      {errorNote}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => turnOff(step.factorId, code)}
          disabled={busy || code.length < 6}
          autoComplete="off"
          className="button-secondary text-danger"
        >
          {busy ? "Checking…" : "Turn off"}
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setStep({ kind: "on", since: step.since, factorId: step.factorId });
          }}
          disabled={busy}
          autoComplete="off"
          className="row-action"
        >
          Keep it on
        </button>
      </div>
    </div>
  );
}
