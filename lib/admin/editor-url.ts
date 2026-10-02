"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useEffectEvent, useRef, useSyncExternalStore } from "react";

// Where a new item or article lives in the URL after its first save.
//
// It stays on the "new" page, with its id in the hash (/admin/music/new#<id>),
// rather than moving to its own page (/admin/music/<id>). A different path is
// a different route: Next's router (which listens to history.replaceState)
// would fetch that page and swap the form for a fresh one about a second
// later, losing focus, the "Saved at" message, anything typed meanwhile and
// uploads in progress. A hash change keeps the same page. Measured on a probe
// route shaped like the editors (Edge and Firefox, 2026-10-02): the path swap
// remounted in 4 of 9 runs (whenever the router refetched; Firefox also flashed
// the loading fallback), the hash in 0 of 13, with no flicker or lost focus.
//
// After a reload, Back or a copied link, the "new" page reads the hash and
// opens the item's own page instead. Both halves live in useNewItemUrl.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "#3f2a…" → the id, if it is one (the hash is untrusted input). */
export function idFromHash(hash: string): string | null {
  const id = hash.replace(/^#/, "");
  return UUID.test(id) ? id : null;
}

// Ids an editor that's open right now put in the hash itself (its first save).
// Those mustn't send it to the item's page: it's already showing that item.
// An editor removes its ids when it unmounts, so Back to new#<id> later, or a
// reload (a fresh page), opens the item's page as intended.
const savedByOpenEditor = new Set<string>();

const noSubscription = () => () => {};

/**
 * For an editor that may be on a "new" page. `rememberNewId` is for its first
 * save: the id goes in the hash and the page stays. `reopening` is true when
 * the page was opened with a saved id in the hash; the editor then shows a
 * short note while it goes to `editHref(id)` (e.g. /admin/music/<id>).
 */
export function useNewItemUrl(isNewPage: boolean, editHref: (id: string) => string) {
  const router = useRouter();
  const ownIds = useRef<string[]>([]);
  // The hash only exists in the browser: null on the server and while hydrating.
  const savedId = useSyncExternalStore(
    noSubscription,
    () => {
      const id = isNewPage ? idFromHash(window.location.hash) : null;
      return id && !savedByOpenEditor.has(id) ? id : null;
    },
    () => null,
  );
  const target = savedId ? editHref(savedId) : null;

  // Only the target decides when to go (the router object needn't be stable).
  const go = useEffectEvent((href: string) => router.replace(href));
  useEffect(() => {
    if (target) go(target);
  }, [target]);

  useEffect(() => {
    const ids = ownIds.current;
    return () => ids.forEach((id) => savedByOpenEditor.delete(id));
  }, []);

  /** After the first save: the new id goes in the URL; the page (and so the form) stays (keeps ?for=). */
  const rememberNewId = useCallback((id: string) => {
    savedByOpenEditor.add(id);
    ownIds.current.push(id);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
  }, []);

  return { reopening: target !== null, rememberNewId };
}
