"use client";

import { useRef, useState, type DragEvent } from "react";
import { addSnippetFile, snippetErrorMessage, type AddedSnippet } from "@/lib/admin/add-snippet";
import { formatBytes, formatDuration, SNIPPET_RULES } from "@/lib/admin/snippet-rules";
import { mediaUrl } from "@/lib/media";

// A song's audio snippet: drop or choose a ready-made MP3 or M4A (at most 30 s
// and 2 MB). It's checked in the browser, uploaded to media/music/, and then
// shown with the browser's own player so Ivan can hear the right file is
// attached. (The site's custom player comes with the public Music page.)

export function SnippetField({
  id,
  path,
  onAdded,
  onRemove,
  describedBy,
}: {
  id: string;
  /** The current snippet's path in the media bucket, or "" for none. */
  path: string;
  onAdded: (snippet: AddedSnippet) => void;
  onRemove: () => void;
  /** The field's error message, if any. */
  describedBy?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [dragging, setDragging] = useState(false);
  // Size is only known right after an upload; the length comes from the player.
  const [uploaded, setUploaded] = useState<AddedSnippet | null>(null);
  const [playable, setPlayable] = useState<{ path: string; seconds: number | null; failed: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const latest = useRef(0); // only the newest attempt may set the snippet

  async function addFile(file: File) {
    const attempt = ++latest.current;
    setBusy(true);
    setError(null);
    try {
      const snippet = await addSnippetFile(file);
      if (attempt !== latest.current) return;
      setUploaded(snippet);
      onAdded(snippet);
      setReplacing(false);
    } catch (e) {
      if (attempt === latest.current) setError(snippetErrorMessage(e));
    } finally {
      if (attempt === latest.current) setBusy(false);
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    // Not filtered by type: some systems report audio files with an empty type.
    const [file] = Array.from(event.dataTransfer.files);
    if (file) addFile(file);
    else setError("Drop an MP3 or M4A file.");
  }

  // What the player found out about the current file (reset when the file changes).
  const current = playable?.path === path ? playable : null;
  const seconds = current?.seconds ?? (uploaded?.path === path ? uploaded.seconds : null);
  const details = current?.failed
    ? "This file couldn't be loaded. Replace it with a new upload."
    : [
        path.split(".").pop()?.toUpperCase(),
        seconds !== null ? formatDuration(seconds) : null,
        uploaded?.path === path ? formatBytes(uploaded.bytes) : null,
      ]
        .filter(Boolean)
        .join(" · ");

  const showPicker = !path || replacing;

  return (
    // The id is on the whole field, so the form can focus it when there's an error.
    <div id={id} tabIndex={-1} role="group" aria-label="Audio snippet" aria-describedby={describedBy} aria-busy={busy} className="outline-none">
      {path && (
        <div className="rounded-xl bg-bg-raised p-3">
          <audio
            key={path}
            controls
            preload="metadata"
            src={mediaUrl(path)}
            aria-label="Snippet preview"
            onLoadedMetadata={(e) => {
              const length = e.currentTarget.duration;
              setPlayable({ path, seconds: Number.isFinite(length) ? length : null, failed: false });
            }}
            onError={() => setPlayable({ path, seconds: null, failed: true })}
            className="w-full"
          />
          <p className={`mt-2 text-sm ${current?.failed ? "text-danger" : "text-fg-muted"}`}>{details}</p>
        </div>
      )}

      {path && !replacing && (
        <div className="mt-2 flex flex-wrap gap-1 text-sm">
          <button type="button" onClick={() => setReplacing(true)} className="row-action border border-rule">
            Replace
          </button>
          <button type="button" onClick={onRemove} className="row-action">
            Remove
          </button>
        </div>
      )}

      {showPicker && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`rounded-xl border-2 border-dashed px-4 py-5 text-sm transition-colors ${
            path ? "mt-2" : ""
          } ${dragging ? "border-accent bg-accent-soft" : "border-rule"} ${busy ? "opacity-70" : ""}`}
        >
          {/* \u00a0 is a non-breaking space, so "2 MB" never splits across lines. */}
          <p aria-live="polite" className="text-fg-muted">
            {busy ? "Checking and uploading…" : `Drop an MP3 or M4A here: up to ${SNIPPET_RULES.maxSeconds}\u00a0seconds and 2\u00a0MB.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className="row-action border border-rule">
              Choose file
            </button>
            {replacing && (
              <button type="button" disabled={busy} onClick={() => setReplacing(false)} className="row-action">
                Cancel
              </button>
            )}
          </div>

          <input
            ref={fileInput}
            type="file"
            // Types and extensions both: some systems only match one or the other.
            accept="audio/mpeg,audio/mp4,audio/x-m4a,.mp3,.m4a"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) addFile(file);
              e.target.value = ""; // choosing the same file again still triggers a change
            }}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
