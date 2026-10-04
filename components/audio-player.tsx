"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatDuration } from "@/lib/format";

/** Seconds the arrow keys move the snippet by. */
const KEY_STEP = 5;

/**
 * The length to show: the one measured when the snippet was uploaded
 * (`tracks.snippet_seconds`) first, since a player can misread a file (Firefox
 * showed 0:00 for one M4A), then the player's own figure once it has one.
 */
export function shownLength(savedSeconds: number | null, playerSeconds: number | null): number | null {
  if (savedSeconds !== null && savedSeconds > 0) return savedSeconds;
  return playerSeconds !== null && Number.isFinite(playerSeconds) && playerSeconds > 0 ? playerSeconds : null;
}

/** Where a point on the bar is, in seconds (0 at the left edge, `length` at the right). */
export function timeAtPoint(x: number, left: number, width: number, length: number): number {
  if (width <= 0) return 0;
  return Math.min(length, Math.max(0, ((x - left) / width) * length));
}

// A song's audio snippet in the site's style: a round play/pause key (like the
// cards' arrow), a bar to click, drag or move with the arrow keys, and the
// time. Only the snippet's details load until Play is pressed. Its controls
// never switch `disabled` (see the Firefox form-state note in CLAUDE.md); a
// file that can't play replaces them with a quiet message.
export function AudioPlayer({ src, title, savedSeconds }: { src: string; title: string; savedSeconds: number | null }) {
  const audio = useRef<HTMLAudioElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [playerSeconds, setPlayerSeconds] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const length = shownLength(savedSeconds, playerSeconds);

  // The file starts loading before React is ready, so an early error or
  // length would be missed by the event handlers: read them once on mount.
  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    if (el.error) setFailed(true);
    if (Number.isFinite(el.duration)) setPlayerSeconds(el.duration);
  }, []);

  // While playing, follow the playhead every frame (timeupdate only fires a few times a second).
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const follow = () => {
      if (audio.current) setTime(audio.current.currentTime);
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch((error: unknown) => {
        // AbortError: a pause came before playback started, nothing's wrong.
        if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
      });
    } else {
      el.pause();
    }
  };

  const seek = useCallback(
    (seconds: number) => {
      const el = audio.current;
      if (!el || length === null) return;
      const to = Math.min(length, Math.max(0, seconds));
      el.currentTime = to;
      setTime(to);
    },
    [length],
  );

  const seekToPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = bar.current?.getBoundingClientRect();
    if (rect && length !== null) seek(timeAtPoint(event.clientX, rect.left, rect.width, length));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number | undefined> = {
      ArrowRight: time + KEY_STEP,
      ArrowUp: time + KEY_STEP,
      ArrowLeft: time - KEY_STEP,
      ArrowDown: time - KEY_STEP,
      Home: 0,
      End: length ?? 0,
    };
    const to = moves[event.key];
    if (to === undefined) return;
    event.preventDefault();
    seek(to);
  };

  const shownTime = Math.min(time, length ?? time);
  const progress = length ? (shownTime / length) * 100 : 0;

  return (
    <div role="group" aria-label={`Preview of ${title}`}>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
          if (audio.current) audio.current.currentTime = 0;
        }}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onDurationChange={(event) => setPlayerSeconds(event.currentTarget.duration)}
        onError={() => setFailed(true)}
      />
      {failed ? (
        <p className="text-sm text-fg-muted">The preview can&apos;t be played right now.</p>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            autoComplete="off"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg text-fg shadow-(--shadow-skeuo) transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {playing ? (
              <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
                <rect x="3.5" y="2.5" width="3" height="11" rx="1" />
                <rect x="9.5" y="2.5" width="3" height="11" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" className="ml-0.5 size-4" fill="currentColor" aria-hidden="true">
                <path d="M4.5 2.8v10.4a.8.8 0 0 0 1.2.7l8.4-5.2a.8.8 0 0 0 0-1.4L5.7 2.1a.8.8 0 0 0-1.2.7Z" />
              </svg>
            )}
          </button>
          <div
            ref={bar}
            role="slider"
            tabIndex={0}
            aria-label="Position"
            aria-valuemin={0}
            aria-valuemax={Math.round(length ?? 0)}
            aria-valuenow={Math.round(shownTime)}
            aria-valuetext={length !== null ? `${formatDuration(shownTime)} of ${formatDuration(length)}` : formatDuration(shownTime)}
            onKeyDown={onKeyDown}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              seekToPointer(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) seekToPointer(event);
            }}
            className="group/bar relative h-11 min-w-0 flex-1 cursor-pointer touch-none rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-rule">
              <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
            </div>
            <div
              className="absolute top-1/2 size-3 -translate-1/2 rounded-full bg-accent shadow-sm transition-transform group-hover/bar:scale-125"
              style={{ left: `${progress}%` }}
            />
          </div>
          <span className="shrink-0 text-xs text-fg-muted tabular-nums">
            {formatDuration(shownTime)} / {length !== null ? formatDuration(length) : "–:––"}
          </span>
        </div>
      )}
    </div>
  );
}
