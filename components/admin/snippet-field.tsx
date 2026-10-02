"use client";

import { useEffect, useEffectEvent, useRef, useState, type DragEvent } from "react";
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
  seconds: savedSeconds,
  onAdded,
  onRemove,
  describedBy,
  onBusyChange,
}: {
  id: string;
  /** The current snippet's path in the media bucket, or "" for none. */
  path: string;
  /** Its length as measured at upload (saved with the song), or null for older snippets. */
  seconds: number | null;
  onAdded: (snippet: AddedSnippet) => void;
  onRemove: () => void;
  /** The field's error message, if any. */
  describedBy?: string;
  /** Tells the form a file is being checked or uploaded, so it can hold off saving. */
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const reportBusy = useEffectEvent((isBusy: boolean) => onBusyChange?.(isBusy));
  useEffect(() => {
    if (!busy) return;
    reportBusy(true);
    return () => reportBusy(false); // done, or the field went away mid-upload
  }, [busy]);
  const [error, setError] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [dragging, setDragging] = useState(false);
  // Right after an upload we know the size and the length (decoded, so exact).
  // A stored snippet's length was saved at upload; older ones only have the player's.
  const [uploaded, setUploaded] = useState<AddedSnippet | null>(null);
  const [playable, setPlayable] = useState<{ path: string; seconds: number | null; failed: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const player = useRef<HTMLAudioElement>(null);
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

  /** What the player knows about the file: its length once the metadata is in, or that it failed. */
  function readPlayer(audio: HTMLAudioElement) {
    if (audio.error) setPlayable({ path, seconds: null, failed: true });
    else if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      setPlayable({ path, seconds: Number.isFinite(audio.duration) ? audio.duration : null, failed: false });
    }
  }

  // On a server-rendered page the browser starts loading the player before React
  // listens, so "loadedmetadata" or "error" may already have happened: read the
  // player's state once it's ours, as well as listening for those events.
  const readMountedPlayer = useEffectEvent(() => player.current && readPlayer(player.current));
  useEffect(() => {
    readMountedPlayer();
  }, [path]);

  // What the player found out about the current file (reset when the file changes).
  const current = playable?.path === path ? playable : null;
  // Measured lengths beat the player's: some files (browser recordings, some MP3s)
  // state a wrong length in their headers, and the player believes it.
  const seconds = (uploaded?.path === path ? uploaded.seconds : null) ?? savedSeconds ?? current?.seconds ?? null;
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
            ref={player}
            aria-label="Snippet preview"
            onLoadedMetadata={(e) => readPlayer(e.currentTarget)}
            onError={(e) => readPlayer(e.currentTarget)}
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
