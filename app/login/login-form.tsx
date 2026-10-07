"use client";

import { useActionState } from "react";
import { GoogleButton } from "@/components/google-button";
import { loginAction, type LoginState } from "./actions";

// Google, or two steps by email on one page: email → code. The email also
// contains a link that signs in directly; the code is there because on phones
// the email app often opens links in a different browser than the one you
// started in. A new email address gets an account.
export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, { step: "email" } as LoginState);

  if (state.step === "code") {
    return (
      <div className="flex max-w-sm flex-col gap-4">
        <form action={action} className="flex flex-col gap-4">
          <p className="text-fg-muted">
            An email is on its way to <span className="text-fg">{state.email}</span>. Open the link
            in it, or type the code here.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-fg-muted">Code from the email</span>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              maxLength={12}
              required
              autoFocus
              className="field font-mono text-lg tracking-[0.3em]"
            />
          </label>
          <ErrorMessage message={state.error} />
          <button type="submit" autoComplete="off" disabled={pending} className="button-primary">
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <form action={action}>
          <button
            type="submit"
            name="restart"
            value="1"
            className="cursor-pointer text-sm text-fg-muted underline underline-offset-4 hover:text-fg"
          >
            Use a different email, or send a new code
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex max-w-sm flex-col gap-6">
      <GoogleButton next={next} />
      <p className="flex items-center gap-3 text-sm text-fg-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-rule" />
        or
        <span className="h-px flex-1 bg-rule" />
      </p>
      <EmailForm next={next} state={state} action={action} pending={pending} />
    </div>
  );
}

function EmailForm({
  next,
  state,
  action,
  pending,
}: {
  next: string;
  state: LoginState;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-fg-muted">Email</span>
        <input name="email" type="email" inputMode="email" autoComplete="email" required className="field" />
      </label>
      <ErrorMessage message={state.error} />
      <button type="submit" autoComplete="off" disabled={pending} className="button-primary">
        {pending ? "Sending…" : "Email me a sign-in code"}
      </button>
    </form>
  );
}

function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {message}
    </p>
  );
}
