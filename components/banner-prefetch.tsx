"use client";

import { useEffect } from "react";

export type BannerPrefetchTarget = {
  /** The section page, e.g. "/games". */
  href: string;
  /** srcset + sizes exactly as the banner's <img> elements render them, character first. */
  images: { srcSet: string; sizes: string }[];
};

// Sections already fetched (or being fetched) in this tab. Module-level, so a
// re-mount or a refreshed `targets` prop never fetches a section twice.
const started = new Set<string>();
// In-flight images, referenced until they finish so they can't be garbage
// collected (and their download cancelled) half-way.
const inFlight = new Set<HTMLImageElement>();

// How long a pointer or keyboard focus has to rest on a link before it counts
// as intent: sweeping across the tab bar, or tabbing past, fetches nothing.
// A touch or a press counts at once (a navigation is about to follow).
const DWELL_MS = 120;

type Connection = { saveData?: boolean; effectiveType?: string };

// Fetches a section's banner images as soon as someone shows they're heading
// there, so the character is already downloaded when the page arrives. The
// browser picks the same candidate from the same srcset / sizes the page will
// use, so the page's own <img> reuses the finished (or still in-flight)
// download. Once per section, never for the current page, and not with Data
// Saver or on 2G. The character comes first; the backdrop (which has a
// blurred placeholder) only after it.
export function BannerPrefetch({ targets }: { targets: BannerPrefetchTarget[] }) {
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    if (connection?.saveData || connection?.effectiveType?.includes("2g")) return;

    let pending: { path: string; timer: number } | null = null;

    function targetFor(event: Event) {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return null;
      const path = new URL(link.href, location.href).pathname;
      if (started.has(path) || location.pathname === path) return null;
      return targets.find((t) => t.href === path) ?? null;
    }

    function fetchSection(target: BannerPrefetchTarget) {
      if (started.has(target.href)) return;
      started.add(target.href);
      const load = (index: number) => {
        const source = target.images[index];
        if (!source) return;
        const img = new Image();
        inFlight.add(img);
        const next = () => {
          inFlight.delete(img);
          load(index + 1);
        };
        img.onload = next;
        img.onerror = next;
        img.decoding = "async";
        img.sizes = source.sizes; // before srcset, so the right candidate is chosen
        img.srcset = source.srcSet;
      };
      load(0);
    }

    function cancelPending() {
      if (pending) window.clearTimeout(pending.timer);
      pending = null;
    }

    function onIntent(event: Event) {
      const target = targetFor(event);
      if (!target) return;
      // A press (touch or click) is near-certain intent: start at once, ahead of
      // the page's own HTML arriving.
      if (event.type === "touchstart" || event.type === "pointerdown") {
        cancelPending();
        fetchSection(target);
        return;
      }
      if (pending?.path === target.href) return;
      cancelPending();
      pending = { path: target.href, timer: window.setTimeout(() => fetchSection(target), DWELL_MS) };
    }

    function onLeave(event: Event) {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || !pending) return;
      // Still inside the same link (moving between its children): keep waiting.
      const to = (event as PointerEvent | FocusEvent).relatedTarget;
      if (to instanceof Node && link.contains(to)) return;
      if (new URL(link.href, location.href).pathname === pending.path) cancelPending();
    }

    document.addEventListener("pointerover", onIntent, { passive: true });
    document.addEventListener("focusin", onIntent);
    document.addEventListener("touchstart", onIntent, { passive: true });
    document.addEventListener("pointerdown", onIntent, { passive: true });
    document.addEventListener("pointerout", onLeave, { passive: true });
    document.addEventListener("focusout", onLeave);
    return () => {
      cancelPending();
      document.removeEventListener("pointerover", onIntent);
      document.removeEventListener("focusin", onIntent);
      document.removeEventListener("touchstart", onIntent);
      document.removeEventListener("pointerdown", onIntent);
      document.removeEventListener("pointerout", onLeave);
      document.removeEventListener("focusout", onLeave);
    };
  }, [targets]);

  return null;
}
