"use client";

import { useEffect, useState, useTransition } from "react";
import { deleteCommentAsAdmin } from "./actions";

// Delete, then "Confirm delete" (which quietly cancels itself after a few
// seconds), like the article list's Delete.
export function DeleteCommentButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 5000);
    return () => clearTimeout(timer);
  }, [confirming]);

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCommentAsAdmin(id);
      if (!result.ok) setError(result.error);
      setConfirming(false);
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {confirming ? (
        <button type="button" autoComplete="off" disabled={pending} onClick={remove} className="row-action text-danger">
          {pending ? "Deleting…" : "Confirm delete"}
        </button>
      ) : (
        <button type="button" autoComplete="off" disabled={pending} onClick={() => setConfirming(true)} className="row-action">
          Delete
        </button>
      )}
      {error && (
        <p role="alert" className="px-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
