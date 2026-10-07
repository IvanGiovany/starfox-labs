"use client";

import { useSyncExternalStore } from "react";
import { applyThemeChoice, readThemeChoice, THEME_CHANGED, type ThemeChoice } from "@/lib/theme";

const CHOICES: { value: ThemeChoice; label: string; note: string }[] = [
  { value: "light", label: "Light", note: "Warm paper." },
  { value: "dark", label: "Dark", note: "The study at night." },
  { value: "system", label: "Match my device", note: "Follows your phone or computer's setting." },
];

// The saved choice is outside React (localStorage), so it's read with
// useSyncExternalStore: it follows the header's toggle and other tabs too.
// On the server, and before the browser has read it, nothing is selected.
function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function ThemeChoices() {
  const current = useSyncExternalStore<ThemeChoice | null>(subscribe, readThemeChoice, () => null);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">Theme</legend>
      {CHOICES.map((choice) => (
        <label
          key={choice.value}
          className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg bg-bg-raised px-4 py-3 transition-colors hover:bg-bg-raised-hover has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
        >
          <input
            type="radio"
            name="theme"
            value={choice.value}
            checked={current === choice.value}
            onChange={() => applyThemeChoice(choice.value)}
            autoComplete="off"
            className="size-4 accent-[var(--accent)]"
          />
          <span>
            <span className="block text-fg">{choice.label}</span>
            <span className="block text-sm text-fg-muted">{choice.note}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
