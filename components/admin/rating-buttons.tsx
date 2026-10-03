"use client";

import type { KeyboardEvent } from "react";

// A rating from 1 to `max` as number buttons, or none: ten stars don't fit a
// phone at a comfortable tap size, ten numbers do (two rows of five). Tapping
// the current rating clears it; the arrow keys move it.
export function RatingButtons({
  id,
  value,
  onChange,
  max = 10,
  describedBy,
}: {
  id: string;
  value: number | null;
  onChange: (rating: number | null) => void;
  max?: number;
  describedBy?: string;
}) {
  function onKeyDown(event: KeyboardEvent) {
    const step = event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = Math.min(max, Math.max(0, (value ?? 0) + step));
    onChange(next === 0 ? null : next);
    document.getElementById(`${id}-${Math.max(1, next)}`)?.focus();
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div role="group" id={id} aria-describedby={describedBy} onKeyDown={onKeyDown} className="grid grid-cols-5 gap-1 sm:grid-cols-10">
        {Array.from({ length: max }, (_, i) => i + 1).map((rating) => (
          <button
            key={rating}
            id={`${id}-${rating}`}
            type="button"
            aria-pressed={value === rating}
            aria-label={`${rating} out of ${max}${value === rating ? " (tap again to clear)" : ""}`}
            onClick={() => onChange(value === rating ? null : rating)}
            className="flex size-11 cursor-pointer items-center justify-center rounded-lg border border-rule text-sm tabular-nums text-fg-muted hover:bg-bg-raised hover:text-fg aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-bg"
          >
            {rating}
          </button>
        ))}
      </div>
      <span className="text-sm text-fg-muted">{value ? `${value} out of ${max}` : "Not rated"}</span>
    </div>
  );
}
