"use client";

import { useEffect, useEffectEvent, useState } from "react";

// Keeps a copy of unsaved form data in this browser's localStorage, so a
// closed tab, a crash, a dead phone battery or a save conflict doesn't lose
// what was typed. The copy is written shortly after each change and removed
// once everything is saved.

export type Backup<T> = { value: T; savedAt: number };

function read<T>(key: string): Backup<T> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Backup<T>) : null;
  } catch {
    return null; // storage blocked (private mode) or unreadable: just no backup
  }
}

export function removeBackup(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

/**
 * `offer` is a backup found when the form opened (and different from what was
 * loaded); show it until Ivan picks `restore()` or `discard()`. Until then
 * nothing is written, so that older copy can't be overwritten by accident.
 */
export function useLocalBackup<T>(key: string, value: T, dirty: boolean, isLoaded: (backup: T) => boolean) {
  const [offer, setOffer] = useState<Backup<T> | null>(null);
  const [checked, setChecked] = useState(false);

  // Look for a backup once the page runs in the browser. (Reading it during
  // the first render would differ from the server's HTML.)
  const matchesLoaded = useEffectEvent(isLoaded);
  useEffect(() => {
    const found = read<T>(key);
    if (found && matchesLoaded(found.value)) removeBackup(key); // nothing new in it
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage only exists after hydration
    setOffer(found && !matchesLoaded(found.value) ? found : null);
    setChecked(true);
  }, [key]);

  useEffect(() => {
    if (!checked || offer) return;
    if (!dirty) return removeBackup(key);
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify({ value, savedAt: Date.now() } satisfies Backup<T>));
      } catch {} // full or blocked storage: the leave-page warning still protects
    }, 400);
    return () => clearTimeout(timer);
  }, [checked, offer, dirty, key, value]);

  return {
    offer,
    restore: (): T | null => {
      const value = offer?.value ?? null;
      setOffer(null); // the restored text is now dirty, so it's backed up again
      return value;
    },
    discard: () => {
      removeBackup(key);
      setOffer(null);
    },
  };
}
