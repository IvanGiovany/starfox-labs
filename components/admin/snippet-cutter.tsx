"use client";

import { useEffect, useEffectEvent, useId, useRef, useState, type DragEvent } from "react";
import { addSnippetFile, snippetErrorMessage, type AddedSnippet } from "@/lib/admin/add-snippet";
import { decodeTrack } from "@/lib/admin/decode-track";
import { blockLoudness, clampStart, cutSnippet, formatPosition, loudestStart, parsePosition, snippetLength, trackPeaks } from "@/lib/admin/snippet-cut";
import { createSnippetEncoder, EncodeCancelled, type SnippetEncoder } from "@/lib/admin/snippet-encoder";
import { CUT_RULES, formatDuration } from "@/lib/admin/snippet-rules";
import { SnippetWaveform } from "./snippet-waveform";

// The snippet cutter: Ivan picks the full song (it never leaves the device),
// moves a 20–30 s window over its waveform (it starts on the loudest part),
// previews it, and "Use this snippet" encodes it as an MP3 and adds it the
// same way as an uploaded snippet: same checks, same upload, same saved length.

type Track = { name: string; channels: Float32Array[]; seconds: number; peaks: Float32Array; loudness: Float64Array };

type Work = { kind: "reading" } | { kind: "encoding"; progress: number } | { kind: "uploading" } | null;

/** Points across the waveform: plenty for the admin's widest form. */
const WAVEFORM_POINTS = 800;

/** Safari can play Web Audio through the iPhone's silent switch, like a music app, if asked. */
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

export function SnippetCutter({
  onAdded,
  onClose,
  onBusyChange,
}: {
  /** A cut snippet has been uploaded. */
  onAdded: (snippet: AddedSnippet) => void;
  onClose: () => void;
  /** Tells the form a snippet is being made or uploaded, so it can hold off saving. */
  onBusyChange?: (busy: boolean) => void;
}) {
  const id = useId();
  const [track, setTrack] = useState<Track | null>(null);
  const [start, setStart] = useState(0);
  const [length, setLength] = useState<number>(CUT_RULES.maxSeconds);
  const [startDraft, setStartDraft] = useState<string | null>(null);
  const [startError, setStartError] = useState(false);
  const [work, setWork] = useState<Work>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const playhead = useRef<HTMLDivElement>(null);
  const encoder = useRef<SnippetEncoder | null>(null);
  const preview = useRef<{ context: AudioContext | null; source: AudioBufferSourceNode | null; frame: number }>({
    context: null,
    source: null,
    frame: 0,
  });
  const latestPick = useRef(0); // only the newest track picked may load

  const busy = work?.kind === "encoding" || work?.kind === "uploading";
  const reportBusy = useEffectEvent((isBusy: boolean) => onBusyChange?.(isBusy));
  useEffect(() => {
    if (!busy) return;
    reportBusy(true);
    return () => reportBusy(false); // done, or the cutter closed mid-upload
  }, [busy]);

  // The encoder's worker starts with the cutter, so lamejs downloads while Ivan picks his part.
  useEffect(() => {
    const current = createSnippetEncoder();
    encoder.current = current;
    const audio = preview.current;
    return () => {
      current.close();
      encoder.current = null;
      stopPreview();
      void audio.context?.close();
      audio.context = null;
    };
  }, []);

  function stopPreview() {
    const audio = preview.current;
    cancelAnimationFrame(audio.frame);
    if (audio.source) {
      audio.source.onended = null;
      audio.source.stop();
      audio.source = null;
    }
    if (playhead.current) playhead.current.hidden = true;
    setPlaying(false);
  }

  /** Plays exactly what "Use this snippet" would encode, fades included. */
  async function playPreview() {
    if (!track) return;
    stopPreview();
    const session = (navigator as AudioSessionNavigator).audioSession;
    if (session) session.type = "playback";
    const audio = preview.current;
    audio.context ??= new AudioContext();
    const context = audio.context;
    const cut = cutSnippet(track.channels, CUT_RULES.sampleRate, start, length);
    const buffer = context.createBuffer(cut.length, cut[0].length, CUT_RULES.sampleRate);
    cut.forEach((samples, channel) => buffer.copyToChannel(samples, channel));
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = stopPreview;
    audio.source = source;
    setPlaying(true);
    await context.resume(); // a context may start suspended until a tap
    if (audio.source !== source) return; // stopped meanwhile
    const begin = context.currentTime;
    source.start();
    const tick = () => {
      const line = playhead.current;
      if (line) {
        line.hidden = false;
        // Clamped: just after start(), the audio clock can still read a moment earlier.
        const played = Math.min(length, Math.max(0, context.currentTime - begin));
        line.style.left = `${((start + played) / track.seconds) * 100}%`;
      }
      audio.frame = requestAnimationFrame(tick);
    };
    tick();
  }

  async function pickTrack(file: File) {
    const attempt = ++latestPick.current;
    stopPreview();
    setError(null);
    setAdded(false);
    setWork({ kind: "reading" });
    try {
      const decoded = await decodeTrack(file);
      if (attempt !== latestPick.current) return;
      const loudness = blockLoudness(decoded.channels, CUT_RULES.sampleRate);
      const newLength = snippetLength(CUT_RULES.maxSeconds, decoded.seconds);
      setTrack({ name: file.name, ...decoded, peaks: trackPeaks(decoded.channels, WAVEFORM_POINTS), loudness });
      setLength(newLength);
      setStart(loudestStart(loudness, newLength, decoded.seconds));
      setStartDraft(null);
      setStartError(false);
    } catch (e) {
      if (attempt === latestPick.current) setError(snippetErrorMessage(e));
    } finally {
      if (attempt === latestPick.current) setWork(null);
    }
  }

  /** Moving the window or changing its length stops the preview: it no longer matches. */
  function changeWindow(nextStart: number, nextLength = length) {
    if (!track) return;
    stopPreview();
    setAdded(false);
    setLength(nextLength);
    setStart(clampStart(nextStart, nextLength, track.seconds));
  }

  function commitStartDraft() {
    if (startDraft === null) return;
    const typed = parsePosition(startDraft);
    setStartError(typed === null);
    if (typed === null) return;
    changeWindow(typed);
    setStartDraft(null);
  }

  async function makeSnippet() {
    if (!track || !encoder.current) return;
    stopPreview();
    setError(null);
    setAdded(false);
    setWork({ kind: "encoding", progress: 0 });
    try {
      const cut = cutSnippet(track.channels, CUT_RULES.sampleRate, start, length);
      const mp3 = await encoder.current.encode(cut, (progress) => setWork({ kind: "encoding", progress }));
      setWork({ kind: "uploading" });
      const snippet = await addSnippetFile(new File([mp3], "snippet.mp3", { type: "audio/mpeg" }));
      onAdded(snippet);
      setAdded(true);
    } catch (e) {
      if (!(e instanceof EncodeCancelled)) setError(snippetErrorMessage(e));
    } finally {
      setWork(null);
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (busy || work?.kind === "reading") return;
    const [file] = Array.from(event.dataTransfer.files);
    if (file) pickTrack(file);
  }

  const hintId = `${id}-hint`;
  const startId = `${id}-start`;
  const lengthId = `${id}-length`;
  const lengths = track ? range(CUT_RULES.minSeconds, snippetLength(CUT_RULES.maxSeconds, track.seconds)) : [];
  const percent = work?.kind === "encoding" ? Math.round(work.progress * 100) : 0;
  const status =
    work?.kind === "reading"
      ? "Reading the track…"
      : work?.kind === "encoding"
        ? "Making the MP3…"
        : work?.kind === "uploading"
          ? "Uploading the snippet…"
          : added
            ? "Added. Listen to it above; to change it, move the window and use it again."
            : "";

  return (
    <div
      role="group"
      aria-label="Snippet cutter"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`rounded-xl border p-3 text-sm sm:p-4 ${dragging ? "border-accent bg-accent-soft" : "border-rule"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <p className="font-medium">Cut from the full track</p>
        <button type="button" onClick={onClose} disabled={work?.kind === "uploading"} className="row-action -mr-2">
          Close
        </button>
      </div>

      {track ? (
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-fg-muted">
          <span className="min-w-0 truncate">
            {track.name} · {formatDuration(track.seconds)}
          </span>
          <button type="button" disabled={busy || work?.kind === "reading"} onClick={() => fileInput.current?.click()} className="row-action -ml-3">
            Choose another track
          </button>
        </p>
      ) : (
        <div className={`mt-2 rounded-lg border-2 border-dashed px-4 py-5 ${dragging ? "border-accent" : "border-rule"}`}>
          <p className="text-fg-muted">
            Drop the full song here, or choose it. It stays on this device: only the snippet you cut is uploaded.
          </p>
          <button
            type="button"
            disabled={work?.kind === "reading"}
            onClick={() => fileInput.current?.click()}
            className="row-action mt-3 border border-rule"
          >
            Choose the full track
          </button>
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        // Any audio the browser can decode; the extensions help systems that report no type.
        accept="audio/*,.mp3,.m4a,.wav,.flac,.ogg,.aif,.aiff"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) pickTrack(file);
          e.target.value = ""; // choosing the same file again still triggers a change
        }}
      />

      {track && (
        <div className="mt-3 space-y-4">
          <SnippetWaveform
            peaks={track.peaks}
            seconds={track.seconds}
            start={start}
            length={length}
            onStartChange={changeWindow}
            playhead={playhead}
            disabled={busy}
            describedBy={hintId}
          />

          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <div>
              <label htmlFor={startId} className="mb-1.5 block font-medium">
                Starts at
              </label>
              <div className="flex gap-1">
                <input
                  id={startId}
                  type="text"
                  inputMode="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  disabled={busy}
                  value={startDraft ?? formatPosition(start)}
                  onFocus={() => setStartDraft(formatPosition(start))}
                  onChange={(e) => setStartDraft(e.target.value)}
                  onBlur={() => {
                    commitStartDraft();
                    setStartDraft(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    commitStartDraft();
                  }}
                  aria-invalid={startError || undefined}
                  aria-describedby={startError ? `${startId}-error` : undefined}
                  className="field w-24 tabular-nums"
                />
                <button type="button" disabled={busy} onClick={() => changeWindow(start - 1)} aria-label="1 second earlier" className="row-action border border-rule">
                  −1 s
                </button>
                <button type="button" disabled={busy} onClick={() => changeWindow(start + 1)} aria-label="1 second later" className="row-action border border-rule">
                  +1 s
                </button>
              </div>
            </div>
            <div>
              <label htmlFor={lengthId} className="mb-1.5 block font-medium">
                Length
              </label>
              <select
                id={lengthId}
                disabled={busy}
                value={length}
                onChange={(e) => changeWindow(start, Number(e.target.value))}
                className="field w-auto"
              >
                {lengths.map((seconds) => (
                  <option key={seconds} value={seconds}>
                    {seconds} seconds
                  </option>
                ))}
              </select>
            </div>
          </div>
          {startError && (
            <p id={`${startId}-error`} className="-mt-2 text-danger">
              Type a time in the song, like 1:23.5.
            </p>
          )}

          <p id={hintId} className="text-fg-muted">
            {formatPosition(start)} to {formatPosition(start + length)}, fading in over {CUT_RULES.fadeInSeconds} s and out over{" "}
            {CUT_RULES.fadeOutSeconds} s. Drag the window, tap the waveform, or use the arrow keys (Shift for whole seconds).
          </p>

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={playing ? stopPreview : playPreview} className="row-action border border-rule">
              {/* Drawn, not "▶" / "■": Windows shows those as coloured emoji. */}
              <svg aria-hidden viewBox="0 0 12 12" className="mr-2 size-3 fill-current">
                {playing ? <rect x="2" y="2" width="8" height="8" rx="1" /> : <path d="M3 1.5v9l7.5-4.5z" />}
              </svg>
              {playing ? "Stop" : "Play preview"}
            </button>
            {work?.kind === "encoding" ? (
              <button type="button" onClick={() => encoder.current?.cancel()} className="row-action border border-rule">
                Cancel
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={makeSnippet} className="button-primary">
                Use this snippet
              </button>
            )}
          </div>
        </div>
      )}

      {work?.kind === "encoding" && (
        <div
          role="progressbar"
          aria-label="Making the MP3"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-raised"
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
        </div>
      )}
      <p aria-live="polite" className="mt-2 text-fg-muted">
        {status}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** [from, from + 1, …, to] */
function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
