// The reader's theme choice, kept in this browser (localStorage "theme"):
// "light" or "dark", or nothing saved = match the device. The root layout's
// inline script applies it before first paint; the header's toggle and
// Settings → Appearance change it through here, so they stay in step.
// Browser only.

export type ThemeChoice = "light" | "dark" | "system";

/** Fired on window whenever the choice changes, so other controls can follow. */
export const THEME_CHANGED = "starfox:theme-changed";

export function readThemeChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return "system";
}

export function applyThemeChoice(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
  try {
    if (choice === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", choice);
  } catch {}
  window.dispatchEvent(new Event(THEME_CHANGED));
}
