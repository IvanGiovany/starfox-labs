"use client";

import { useMemo, useRef, type KeyboardEvent, type PointerEvent, type Ref } from "react";
import { clampStart, formatPosition, latestStart } from "@/lib/admin/snippet-cut";
import { formatDuration } from "@/lib/admin/snippet-rules";

// The full track's waveform with the snippet's window on it. Drag the window,
// or tap elsewhere to centre it there; the window itself is a slider for the
// keyboard. On a phone, a vertical swipe still scrolls the page (touch-action:
// pan-y), and a press only moves the window once it turns into a tap or a
// sideways drag, so scrolling past the waveform doesn't move it.
//
// Drawn as SVG, so it's sharp on any screen, takes the theme's colours, and
// stretches with the page without being redrawn.

/** Pixels a press may move and still count as a tap. */
const TAP_SLOP = 4;

export function SnippetWaveform({
  peaks,
  seconds,
  start,
  length,
  onStartChange,
  playhead,
  disabled = false,
  describedBy,
}: {
  /** Loudest sample per slice of the track (trackPeaks). */
  peaks: Float32Array;
  /** The track's length. */
  seconds: number;
  start: number;
  length: number;
  onStartChange: (start: number) => void;
  /** A line the cutter moves during the preview (directly, without re-rendering). */
  playhead: Ref<HTMLDivElement>;
  disabled?: boolean;
  describedBy?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const slider = useRef<HTMLDivElement>(null);
  const press = useRef<{ pointer: number; x: number; offset: number; dragging: boolean } | null>(null);
  const path = useMemo(() => waveformPath(peaks), [peaks]);
  const latest = latestStart(length, seconds);

  function timeAt(clientX: number): number {
    const rect = box.current!.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * seconds;
  }

  function moveTo(next: number) {
    const clamped = clampStart(next, length, seconds);
    if (clamped !== start) onStartChange(clamped);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
    const time = timeAt(event.clientX);
    const inside = time >= start && time <= start + length;
    // Dragging the window keeps the spot under the finger; a drag that starts outside it centres it.
    press.current = { pointer: event.pointerId, x: event.clientX, offset: inside ? time - start : length / 2, dragging: false };
    if (event.pointerType === "mouse") event.preventDefault(); // no text selection while dragging
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = press.current;
    if (!current || current.pointer !== event.pointerId) return;
    if (!current.dragging) {
      if (Math.abs(event.clientX - current.x) < TAP_SLOP) return;
      current.dragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      slider.current?.focus({ preventScroll: true });
    }
    moveTo(timeAt(event.clientX) - current.offset);
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const current = press.current;
    if (!current || current.pointer !== event.pointerId) return;
    press.current = null;
    if (current.dragging) return;
    // A tap: outside the window centres it there; on the window it just selects it for the keyboard.
    const time = timeAt(event.clientX);
    if (time < start || time > start + length) moveTo(time - length / 2);
    slider.current?.focus({ preventScroll: true });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const step = event.shiftKey ? 1 : 0.1;
    const next: number | undefined = {
      ArrowLeft: start - step,
      ArrowDown: start - step,
      ArrowRight: start + step,
      ArrowUp: start + step,
      PageDown: start - 5,
      PageUp: start + 5,
      Home: 0,
      End: latest,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    moveTo(next);
  }

  const left = (start / seconds) * 100;
  const width = Math.min(100, (length / seconds) * 100);

  return (
    <div>
      <div
        ref={box}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        // The browser took the gesture over (a vertical swipe scrolls the page).
        onPointerCancel={() => (press.current = null)}
        className={`relative h-24 touch-pan-y overflow-hidden rounded-lg bg-bg-raised select-none sm:h-28 ${
          disabled ? "opacity-60" : "cursor-pointer"
        }`}
      >
        <svg viewBox={`0 0 ${peaks.length} 2`} preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full fill-fg-muted/45">
          <path d={path} />
        </svg>
        <div
          ref={slider}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label="Snippet position"
          aria-describedby={describedBy}
          aria-valuemin={0}
          aria-valuemax={latest}
          aria-valuenow={start}
          aria-valuetext={`${formatPosition(start)} to ${formatPosition(start + length)}`}
          aria-disabled={disabled || undefined}
          onKeyDown={onKeyDown}
          style={{ left: `${left}%`, width: `${width}%` }}
          className="absolute inset-y-0 cursor-grab overflow-hidden rounded-md bg-accent-soft outline-offset-2 outline-accent focus-visible:outline-2"
        >
          {/* The same waveform in the accent colour, shifted so it lines up with the one behind. */}
          <svg
            viewBox={`0 0 ${peaks.length} 2`}
            preserveAspectRatio="none"
            aria-hidden
            className="absolute inset-y-0 h-full max-w-none fill-accent"
            style={{ width: `${(100 / width) * 100}%`, left: `${(-left / width) * 100}%` }}
          >
            <path d={path} />
          </svg>
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-accent ring-inset" />
        </div>
        <div ref={playhead} hidden className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-fg" />
      </div>
      <div aria-hidden className="mt-1 flex justify-between text-xs text-fg-muted tabular-nums">
        <span>0:00</span>
        <span>{formatDuration(seconds)}</span>
      </div>
    </div>
  );
}

/**
 * The waveform as one filled shape in a box `peaks.length` wide and 2 high:
 * each peak rises above and falls below the centre line. Scaled so the loudest
 * peak nearly fills the height, so quiet tracks are still easy to read.
 */
function waveformPath(peaks: Float32Array): string {
  let loudest = 0;
  for (const peak of peaks) loudest = Math.max(loudest, peak);
  const scale = loudest > 0 ? 0.95 / loudest : 0;
  const y = (peak: number, side: 1 | -1) => (1 - side * peak * scale).toFixed(3);
  const top = Array.from(peaks, (peak, i) => `L${i + 0.5},${y(peak, 1)}`);
  const bottom = Array.from(peaks, (peak, i) => `L${i + 0.5},${y(peak, -1)}`).reverse();
  return `M0,1${top.join("")}L${peaks.length},1${bottom.join("")}Z`;
}
