"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { COMMENT_COUNT_FROM, COMMENT_MAX, commentProblem, normaliseCommentBody } from "@/lib/comments";

// The text box for a new comment, a reply, or an edit. It grows with the
// text, shows a character count near the limit, and sends with the button or
// Ctrl/⌘+Enter. `onSubmit` returns an error message, or null when it worked
// (the box then empties, or closes for replies and edits).

export function CommentForm({
  label,
  placeholder,
  submitLabel,
  initial = "",
  autoFocus = false,
  onSubmit,
  onCancel,
}: {
  label: string;
  placeholder: string;
  submitLabel: string;
  initial?: string;
  autoFocus?: boolean;
  onSubmit: (body: string) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const errorId = useId();

  const body = normaliseCommentBody(text);
  const problem = commentProblem(body);
  const unchanged = initial !== "" && body === normaliseCommentBody(initial);

  // Grow with the text (never shrinking below the starting rows).
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${box.scrollHeight + 2}px`;
  }, [text]);

  // Replies and edits open with the caret at the end of the text.
  useEffect(() => {
    const box = boxRef.current;
    if (!autoFocus || !box) return;
    box.focus();
    box.setSelectionRange(box.value.length, box.value.length);
  }, [autoFocus]);

  async function submit() {
    if (busy || problem || unchanged) return;
    setBusy(true);
    setError(null);
    const failure = await onSubmit(body);
    setBusy(false);
    if (failure) return setError(failure);
    if (!onCancel) setText(""); // the main box stays, empty; replies and edits close
  }

  return (
    <form
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label>
        <span className="sr-only">{label}</span>
        <textarea
          ref={boxRef}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              submit();
            }
            if (event.key === "Escape" && onCancel) onCancel();
          }}
          rows={3}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="field block resize-none leading-relaxed"
        />
      </label>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
        {error && (
          <p id={errorId} role="alert" className="mr-auto text-sm text-danger">
            {error}
          </p>
        )}
        {body.length >= COMMENT_COUNT_FROM && (
          <span className={`text-sm tabular-nums ${body.length > COMMENT_MAX ? "text-danger" : "text-fg-muted"}`}>
            {body.length.toLocaleString("en")} / {COMMENT_MAX.toLocaleString("en")}
          </span>
        )}
        {onCancel && (
          <button type="button" onClick={onCancel} className="row-action" autoComplete="off">
            Cancel
          </button>
        )}
        <button type="submit" disabled={busy || !!problem || unchanged} className="button-primary disabled:cursor-default" autoComplete="off">
          {busy ? "Sending…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
