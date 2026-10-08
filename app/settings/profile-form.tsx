"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { LocalDateTime } from "@/components/local-date-time";
import { announceProfileChange } from "@/lib/profile-events";
import { displayNameProblem, normaliseUsername, usernameProblem, DISPLAY_NAME_MAX } from "@/lib/profile-rules";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { saveProfile, type ProfileState } from "./actions";

// Display name and username. The username is checked as you type: the rules
// first (lib/profile-rules.ts), then, after a short pause, whether someone
// else has it (profiles are public). Saving checks everything again on the
// server, and the database has the final say. Usernames change once every 30
// days (the admin's any time): while that runs, the field is read-only and
// says when it can change again.

type Check = { state: "idle" | "checking" | "ok" | "bad"; message?: string };

export function ProfileForm({
  userId,
  isAdmin,
  initial,
  nextUsernameChange,
}: {
  userId: string;
  isAdmin: boolean;
  initial: { displayName: string; username: string };
  /** When the username may change again; null if it may now. */
  nextUsernameChange: string | null;
}) {
  const [state, action, pending] = useActionState(saveProfile, { status: "idle", values: initial } as ProfileState);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [username, setUsername] = useState(initial.username);
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const [savedName, setSavedName] = useState(initial.username);
  const [lockedUntil, setLockedUntil] = useState(nextUsernameChange);

  // A saved profile: the header's menu shows the new name straight away.
  useEffect(() => {
    if (state.status === "saved") announceProfileChange();
  }, [state]);

  // Is the username free? Asked once typing pauses; a newer keystroke cancels it.
  useEffect(() => {
    if (check.state !== "checking") return;
    const wanted = username;
    const timer = setTimeout(async () => {
      const { data, error } = await createSupabaseBrowserClient()
        .from("profiles")
        .select("id")
        .eq("username", wanted)
        .neq("id", userId)
        .maybeSingle();
      setCheck(
        error ? { state: "idle" } : data ? { state: "bad", message: "That username is taken." } : { state: "ok", message: "Available." },
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [check.state, username, userId]);

  function typeUsername(raw: string) {
    const value = normaliseUsername(raw);
    setUsername(value);
    if (value === savedName) return setCheck({ state: "idle" });
    const problem = usernameProblem(value, isAdmin);
    setCheck(problem ? { state: "bad", message: problem } : { state: "checking" });
  }

  const nameProblem = displayName.trim() ? displayNameProblem(displayName.trim(), isAdmin) : null;
  const errors = state.status === "error" ? state.errors : undefined;
  const saved = state.status === "saved" && !pending;
  // Once saved, the new username is "yours": no more "Available." under it.
  // (Updating state while rendering is React's way to follow a changed value.)
  // A new username also starts the 30 days.
  if (saved && savedName !== state.values.username) {
    setSavedName(state.values.username);
    setCheck({ state: "idle" });
    setLockedUntil(state.nextUsernameChange ?? null);
  }

  return (
    <form action={action} autoComplete="off" className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-fg-muted">Display name</span>
        <input
          name="displayName"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={DISPLAY_NAME_MAX + 10}
          required
          className="field"
          aria-invalid={Boolean(errors?.displayName || nameProblem) || undefined}
        />
        <FieldNote error={errors?.displayName ?? nameProblem ?? undefined} hint="Shown with your comments. Up to 40 characters." />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-fg-muted">Username</span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="text-fg-muted">
            @
          </span>
          <input
            name="username"
            value={username}
            onChange={(event) => typeUsername(event.target.value)}
            readOnly={lockedUntil !== null}
            maxLength={30}
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="field read-only:bg-bg-raised read-only:text-fg-muted"
            aria-invalid={check.state === "bad" || Boolean(errors?.username) || undefined}
          />
        </span>
        <FieldNote
          error={errors?.username ?? (check.state === "bad" ? check.message : undefined)}
          ok={check.state === "ok" ? check.message : undefined}
          hint={
            lockedUntil ? (
              <>
                You can change your username again on <LocalDateTime iso={lockedUntil} />.
              </>
            ) : check.state === "checking" ? (
              "Checking…"
            ) : isAdmin ? (
              "3–20 lowercase letters, numbers or _."
            ) : (
              "3–20 lowercase letters, numbers or _. You can change it once every 30 days."
            )
          }
        />
      </label>

      {errors?.form && (
        <p role="alert" className="text-sm text-danger">
          {errors.form}
        </p>
      )}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending || check.state === "bad" || check.state === "checking" || Boolean(nameProblem)}
          autoComplete="off"
          className="button-primary"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <p role="status" className="text-sm text-fg-muted">
          {saved ? "Saved." : ""}
        </p>
      </div>
    </form>
  );
}

function FieldNote({ error, ok, hint }: { error?: string; ok?: string; hint: ReactNode }) {
  if (error) return <span className="text-sm text-danger">{error}</span>;
  if (ok) return <span className="text-sm text-fg">{ok}</span>;
  return <span className="text-sm text-fg-muted">{hint}</span>;
}
