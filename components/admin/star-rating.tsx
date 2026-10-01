"use client";

import type { KeyboardEvent } from "react";

// A rating from 1 to `max` stars, or none. Tapping the current rating clears
// it; the arrow keys move it. Large tap targets for phones.
export function StarRating({
  id,
  value,
  onChange,
  max = 5,
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
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" id={id} aria-describedby={describedBy} onKeyDown={onKeyDown} className="flex">
        {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            id={`${id}-${star}`}
            type="button"
            aria-pressed={value !== null && star <= value}
            aria-label={`${star} star${star === 1 ? "" : "s"}${value === star ? " (tap again to clear)" : ""}`}
            onClick={() => onChange(value === star ? null : star)}
            className={`flex size-11 cursor-pointer items-center justify-center rounded-lg text-2xl leading-none hover:bg-bg-raised ${
              value !== null && star <= value ? "text-accent" : "text-rule"
            }`}
          >
            ★
          </button>
        ))}
      </div>
      <span className="text-sm text-fg-muted">{value ? `${value} of ${max}` : "Not rated"}</span>
    </div>
  );
}
