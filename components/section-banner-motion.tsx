"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import styles from "./section-banner.module.css";

// The one interactive part of a section banner: a small pause / play button
// (moving content needs a way to stop it, WCAG 2.2.2). The choice lives in
// memory, so the button always works, and is saved in this browser when
// storage allows, so every section remembers it. The motion also stops while
// the banner is off screen or the tab is hidden. This only sets data
// attributes on the banner; the CSS module pauses the animations. With
// reduced motion there is no motion, and the CSS hides the button.

const KEY = "banner-motion";

let paused: boolean | null = null; // null: not read from storage yet
const listeners = new Set<() => void>();

function readStorage() {
  try {
    return localStorage.getItem(KEY) === "paused";
  } catch {
    return false;
  }
}

function getPaused() {
  if (paused === null) paused = readStorage();
  return paused;
}

function setPaused(next: boolean) {
  paused = next;
  try {
    if (next) localStorage.setItem(KEY, "paused");
    else localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab changed it: follow along.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY && event.key !== null) return;
    paused = readStorage();
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function SectionBannerMotion() {
  const button = useRef<HTMLButtonElement>(null);
  // The server can't know the saved choice, so it renders "playing".
  const isPaused = useSyncExternalStore(subscribe, getPaused, () => false);

  useEffect(() => {
    button.current?.closest("[data-section-banner]")?.toggleAttribute("data-paused", isPaused);
  }, [isPaused]);

  useEffect(() => {
    const banner = button.current?.closest<HTMLElement>("[data-section-banner]");
    if (!banner) return;
    const observer = new IntersectionObserver(([entry]) => banner.toggleAttribute("data-offscreen", !entry.isIntersecting));
    observer.observe(banner);
    const onVisibility = () => banner.toggleAttribute("data-hidden", document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <button
      ref={button}
      type="button"
      onClick={() => setPaused(!isPaused)}
      aria-pressed={isPaused}
      aria-label="Pause animation"
      title={isPaused ? "Play animation" : "Pause animation"}
      className={styles.toggle}
    >
      <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden="true">
        {isPaused ? <path d="M5 3.5v9l7.5-4.5z" /> : <path d="M4.5 3h2.5v10H4.5zM9 3h2.5v10H9z" />}
      </svg>
    </button>
  );
}
