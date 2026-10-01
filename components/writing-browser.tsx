"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PostSummary, TagCount } from "@/lib/posts";
import { matchesAll, normalize, toTerms, type SearchIndex } from "@/lib/search";
import { WritingCard } from "./writing-card";

const PAGE_SIZE = 24;

type Props = { posts: PostSummary[]; tags: TagCount[] };

// Search, tag filters and "load more" for the Writing page.
//
// URL state: `/writing?tag=nextjs&q=cache`, so a filtered view can be shared.
// We update the URL with the browser's own history API (Next.js keeps
// useSearchParams in sync), which changes the address without asking the
// server for anything:
//   - typing uses replaceState, so the Back button still leaves the page
//     instead of undoing one keystroke at a time;
//   - clicking a tag uses pushState, so Back returns to the previous filter.
export function WritingBrowser({ posts, tags }: Props) {
  const searchParams = useSearchParams();
  const tag = searchParams.get("tag");
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { index, loadIndex } = useSearchIndex();

  // Back/Forward restore the tag through useSearchParams; restore the query too.
  useEffect(() => {
    const onPopState = () => setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Arriving with ?q= already in the URL: fetch the body index straight away.
  useEffect(() => {
    if (searchParams.get("q")) loadIndex();
    // Only on first render; later searches load it from the input handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results = useFilteredPosts(posts, { tag, query, index });

  function onQueryChange(value: string) {
    setQuery(value);
    setLimit(PAGE_SIZE);
    if (value) loadIndex();
    window.history.replaceState(null, "", writingUrl({ tag, q: value }));
  }

  function onTagChange(next: string | null) {
    setLimit(PAGE_SIZE);
    window.history.pushState(null, "", writingUrl({ tag: next, q: query }));
  }

  function clearAll() {
    setQuery("");
    setLimit(PAGE_SIZE);
    window.history.pushState(null, "", writingUrl({ tag: null, q: "" }));
  }

  return (
    <WritingView
      posts={results}
      totalCount={posts.length}
      tags={tags}
      tag={tag}
      query={query}
      limit={limit}
      onQueryChange={onQueryChange}
      onTagChange={onTagChange}
      onLoadMore={() => setLimit((n) => n + PAGE_SIZE)}
      onClear={clearAll}
    />
  );
}

/**
 * What the page shows before the browser takes over: the first cards and the
 * filters, with the search box disabled. This is the prerendered HTML, so
 * search engines and slow connections still get real content.
 */
export function WritingBrowserFallback({ posts, tags }: Props) {
  return (
    <WritingView posts={posts} totalCount={posts.length} tags={tags} tag={null} query="" limit={PAGE_SIZE} />
  );
}

function writingUrl({ tag, q }: { tag: string | null; q: string }) {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/writing?${qs}` : "/writing";
}

/** Downloads the article-body index once, the first time it's needed. */
function useSearchIndex() {
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const started = useRef(false);

  function loadIndex() {
    if (started.current) return;
    started.current = true;
    fetch("/writing/search-index")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((data: SearchIndex) => setIndex(data))
      .catch(() => {
        // Titles, summaries and tags still search fine; allow a retry later.
        started.current = false;
      });
  }

  return { index, loadIndex };
}

function useFilteredPosts(
  posts: PostSummary[],
  { tag, query, index }: { tag: string | null; query: string; index: SearchIndex | null },
) {
  // Normalize each post's searchable text once, not on every keystroke.
  const haystacks = useMemo(
    () =>
      new Map(
        posts.map((post) => [
          post.slug,
          normalize([post.title, post.summary, post.tags.join(" ")].join(" ")) + " " + (index?.[post.slug] ?? ""),
        ]),
      ),
    [posts, index],
  );

  return useMemo(() => {
    const terms = toTerms(query);
    return posts.filter(
      (post) =>
        (!tag || post.tags.includes(tag)) && (terms.length === 0 || matchesAll(haystacks.get(post.slug) ?? "", terms)),
    );
  }, [posts, haystacks, tag, query]);
}

type ViewProps = {
  posts: PostSummary[];
  totalCount: number;
  tags: TagCount[];
  tag: string | null;
  query: string;
  limit: number;
  // Missing handlers = the static fallback (controls shown but inactive).
  onQueryChange?: (value: string) => void;
  onTagChange?: (tag: string | null) => void;
  onLoadMore?: () => void;
  onClear?: () => void;
};

function WritingView({
  posts,
  totalCount,
  tags,
  tag,
  query,
  limit,
  onQueryChange,
  onTagChange,
  onLoadMore,
  onClear,
}: ViewProps) {
  const visible = posts.slice(0, limit);
  const isFiltered = Boolean(tag || query);
  const status = isFiltered
    ? `${posts.length} of ${totalCount} ${totalCount === 1 ? "article" : "articles"}`
    : `${totalCount} ${totalCount === 1 ? "article" : "articles"}`;

  return (
    <div className="pb-8">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex w-full max-w-md items-center gap-2 rounded-lg border border-rule bg-bg px-3 py-2 shadow-[0_1px_3px_rgb(0_0_0/0.05)] focus-within:border-accent">
            <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-fg-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="sr-only">Search writing</span>
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange?.(e.target.value)}
              disabled={!onQueryChange}
              autoComplete="off"
              placeholder="Search titles, tags and text…"
              className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted/80 disabled:cursor-wait"
            />
          </label>
          {/* Announced to screen readers as results change. */}
          <p aria-live="polite" className="text-sm text-fg-muted">
            {status}
          </p>
        </div>

        <nav aria-label="Filter by tag" className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          <TagLink label="all" count={totalCount} active={!tag} href="/writing" onSelect={onTagChange && (() => onTagChange(null))} />
          {tags.map(({ tag: t, count }) => (
            <TagLink
              key={t}
              label={t}
              count={count}
              active={tag === t}
              href={`/writing?tag=${encodeURIComponent(t)}`}
              onSelect={onTagChange && (() => onTagChange(t))}
            />
          ))}
        </nav>
      </div>

      {visible.length > 0 ? (
        <div className="grid grid-cols-2 gap-(--grid-gap) sm:auto-rows-[minmax(11rem,auto)] lg:grid-cols-4 lg:auto-rows-(--cell)">
          {visible.map((post) => (
            <WritingCard key={post.slug} post={post} maxTags={2} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-bg-raised px-5 py-10 text-fg-muted">
          Nothing matches{query && <> &ldquo;<span className="text-fg">{query}</span>&rdquo;</>}
          {tag && <> in <span className="text-fg">{tag}</span></>}.{" "}
          <button type="button" onClick={onClear} className="cursor-pointer text-accent underline underline-offset-4">
            Clear filters
          </button>
        </p>
      )}

      {posts.length > visible.length && (
        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={!onLoadMore}
            autoComplete="off"
            className="cursor-pointer rounded-lg border border-rule bg-bg px-4 py-2 text-sm shadow-[0_1px_3px_rgb(0_0_0/0.06)] transition-colors hover:border-accent hover:text-accent disabled:cursor-wait"
          >
            Load more
          </button>
          <span className="text-sm text-fg-muted">
            Showing {visible.length} of {posts.length}
          </span>
        </div>
      )}
    </div>
  );
}

function TagLink({
  label,
  count,
  active,
  href,
  onSelect,
}: {
  label: string;
  count: number;
  active: boolean;
  href: string;
  onSelect?: () => void;
}) {
  return (
    <a
      href={href}
      aria-current={active ? "true" : undefined}
      onClick={(e) => {
        if (!onSelect) return;
        e.preventDefault();
        onSelect();
      }}
      className={
        active
          ? "text-fg underline decoration-accent decoration-2 underline-offset-[6px]"
          : "text-fg-muted no-underline hover:text-fg"
      }
    >
      {label} <span className="text-fg-muted">({count})</span>
    </a>
  );
}
