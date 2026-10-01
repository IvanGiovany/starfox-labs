"use client";

import type { Root } from "hast";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { ArticleView } from "@/components/article-view";
import { fetchPreview } from "@/lib/admin/fetch-preview";
import { normalizeTag, type PostFields } from "@/lib/admin/post-form";
import { readingTime } from "@/lib/format";
import { hastToReact } from "@/lib/markdown-react";

// The editor's live preview. The server renders the markdown to an HTML tree
// (/admin/writing/preview, a route handler, so it never queues in front of
// Save); this file turns the tree into React with the same components and
// the same ArticleView as the public article page.

const DEBOUNCE_MS = 300;

type PreviewState = { tree: Root | null; renderedBody: string | null; updating: boolean; error: string | null };

/**
 * Keeps a rendered preview of `bodyMd` while `active`. The first render is
 * immediate; after that it waits until typing pauses. Each request cancels
 * the one before, and the last good preview stays up while the next loads.
 */
function useRenderedBody(bodyMd: string, active: boolean) {
  const [state, setState] = useState<PreviewState>({ tree: null, renderedBody: null, updating: false, error: null });
  const shown = useRef<string | null>(null); // the body the current tree was rendered from

  useEffect(() => {
    if (!active || bodyMd === shown.current) return;
    const controller = new AbortController();
    const delay = shown.current === null ? 0 : DEBOUNCE_MS;

    const timer = setTimeout(async () => {
      if (bodyMd.trim() === "") {
        shown.current = bodyMd;
        setState({ tree: null, renderedBody: bodyMd, updating: false, error: null });
        return;
      }
      setState((s) => ({ ...s, updating: true }));
      try {
        const result = await fetchPreview(bodyMd, controller.signal);
        if (result.ok) {
          shown.current = bodyMd;
          setState({ tree: result.tree, renderedBody: bodyMd, updating: false, error: null });
        } else {
          setState((s) => ({ ...s, updating: false, error: result.error }));
        }
      } catch {
        // Aborted: newer text is on its way, and its request takes over.
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [bodyMd, active]);

  const body = useMemo(() => (state.tree ? hastToReact(state.tree) : null), [state.tree]);
  // "Updating" only while what's shown differs from the text (e.g. not after an undo
  // back to the rendered version, whose request was cancelled mid-flight).
  const stale = state.renderedBody !== bodyMd;
  return { body, error: state.error, stale, updating: state.updating && stale };
}

/**
 * Links inside the preview open in a new tab (so a stray click never leaves
 * the editor), and "#heading" links scroll within the preview.
 */
function keepClicksInPreview(event: MouseEvent<HTMLElement>) {
  const link = (event.target as Element).closest("a[href]");
  if (!link || event.defaultPrevented) return;
  event.preventDefault();
  const href = link.getAttribute("href") ?? "";
  if (href.startsWith("#")) {
    event.currentTarget.querySelector(`[id="${CSS.escape(decodeURIComponent(href.slice(1)))}"]`)?.scrollIntoView({ behavior: "smooth" });
  } else {
    window.open(href, "_blank", "noopener");
  }
}

export function LivePreview({
  fields,
  publishedAt,
  active,
  hidden,
  framed,
}: {
  fields: PostFields;
  publishedAt: string | null;
  /** Only fetch while the preview is on screen. */
  active: boolean;
  /** Write mode: kept (with its last render) but not shown, so switching back is instant. */
  hidden: boolean;
  /** Split mode: a scrollable panel beside the form. Otherwise: the full page. */
  framed: boolean;
}) {
  const { body, updating, stale, error } = useRenderedBody(fields.bodyMd, active);
  const tags = useMemo(() => [...new Set(fields.tags.map(normalizeTag).filter(Boolean))], [fields.tags]);

  const status = error ? (
    <span className="text-danger">{error}</span>
  ) : updating || stale ? (
    "Updating…"
  ) : (
    "Up to date"
  );

  return (
    <section
      aria-label="Preview"
      onClickCapture={keepClicksInPreview}
      hidden={hidden}
      className={
        framed
          ? "sticky top-4 max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-xl border border-rule px-8 pb-10"
          : "mx-auto max-w-[42rem] pb-10"
      }
    >
      <p
        role="status"
        className={`text-xs text-fg-muted ${framed ? "sticky top-0 z-10 -mx-8 border-b border-rule bg-bg/95 px-8 py-2 backdrop-blur" : "pt-2"}`}
      >
        Preview · {status}
      </p>
      <div className={`transition-opacity duration-200 ${updating ? "opacity-60" : ""}`}>
        <ArticleView
          title={fields.title.trim() || "Untitled"}
          publishedAt={publishedAt}
          minutes={readingTime(fields.bodyMd)}
          tags={tags}
          coverImageUrl={null}
          youtubeUrl={fields.youtubeUrl.trim() || null}
          body={body ?? <p className="text-fg-muted">Nothing to preview yet.</p>}
        />
      </div>
    </section>
  );
}
