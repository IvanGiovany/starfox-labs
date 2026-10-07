"use client";

import { useActionState, useState } from "react";
import { deleteAccount, type DeleteState } from "./actions";

// The typed confirmation: the button stays off until the username is typed
// exactly (the server checks it again).
export function DeleteAccountForm({ username }: { username: string }) {
  const [state, action, pending] = useActionState(deleteAccount, {} as DeleteState);
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === username;

  return (
    <form action={action} autoComplete="off" className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-fg-muted">
          To confirm, type your username: <span className="font-mono text-fg">{username}</span>
        </span>
        <input
          name="confirm"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="field"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={!matches || pending}
        autoComplete="off"
        className="min-h-11 cursor-pointer self-start rounded-lg bg-danger px-4 font-medium text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}
