"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/format";
import { matchesAll, normalize, toTerms } from "@/lib/search";
import { deletePost, setPostStatus, type ActionResult } from "./actions";

export type AdminPost = {
  id: string;
  slug: string;
  title: string;
  status: string;
  tags: string[];
  published_at: string | null;
  updated_at: string;
};

type Filter = "all" | "draft" | "published";

// The article list: search, a status filter, and one-tap Publish / Unpublish
// / Delete. Everything is on one page (a few hundred rows is still small), so
// searching and filtering are instant.
export function PostList({ posts }: { posts: AdminPost[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: posts.length,
      draft: posts.filter((p) => p.status === "draft").length,
      published: posts.filter((p) => p.status === "published").length,
    }),
    [posts],
  );

  const visible = useMemo(() => {
    const terms = toTerms(query);
    return posts.filter(
      (post) =>
        (filter === "all" || post.status === filter) &&
        (terms.length === 0 || matchesAll(normalize(`${post.title} ${post.slug} ${post.tags.join(" ")}`), terms)),
    );
  }, [posts, filter, query]);

  return (
    <div className="pb-24 sm:pb-0">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Show" className="flex gap-1">
          {(["all", "draft", "published"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className="min-h-11 cursor-pointer rounded-lg px-3 text-sm text-fg-muted hover:text-fg aria-pressed:bg-bg-raised aria-pressed:text-fg"
            >
              {f === "all" ? "All" : f === "draft" ? "Drafts" : "Published"}{" "}
              <span className="text-fg-muted">({counts[f]})</span>
            </button>
          ))}
        </div>
        <label className="sm:w-72">
          <span className="sr-only">Search articles</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles and tags"
            className="field"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl bg-bg-raised px-5 py-8 text-fg-muted">
          {posts.length === 0 ? "No articles yet. Start one with New article." : "No articles match."}
        </p>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule">
          {visible.map((post) => (
            <PostRow key={post.id} post={post} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PostRow({ post }: { post: AdminPost }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const published = post.status === "published";

  // The delete confirmation quietly cancels itself after a few seconds.
  useEffect(() => {
    if (!confirmingDelete) return;
    const timer = setTimeout(() => setConfirmingDelete(false), 5000);
    return () => clearTimeout(timer);
  }, [confirmingDelete]);

  function run(action: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  }

  const date = published && post.published_at ? `Published ${formatDate(post.published_at)}` : `Edited ${formatDate(post.updated_at)}`;

  return (
    <li className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-6 ${pending ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge toneKey={published ? "read" : "learning"}>{published ? "Published" : "Draft"}</Badge>
          <Link href={`/admin/writing/${post.id}`} className="font-serif text-lg leading-snug text-fg no-underline hover:text-accent">
            {post.title}
          </Link>
        </div>
        <p className="mt-1 text-sm text-fg-muted">
          {date}
          {post.tags.length > 0 && <> · {post.tags.join(", ")}</>}
        </p>
        {error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1 text-sm">
        <Link href={`/admin/writing/${post.id}`} className="row-action no-underline">
          Edit
        </Link>
        {published && (
          <a href={`/writing/${post.slug}`} target="_blank" rel="noreferrer" className="row-action no-underline">
            View ↗
          </a>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setPostStatus(post.id, published ? "draft" : "published"))}
          className="row-action"
        >
          {published ? "Unpublish" : "Publish"}
        </button>
        {confirmingDelete ? (
          <button type="button" disabled={pending} onClick={() => run(() => deletePost(post.id))} className="row-action text-danger">
            Confirm delete
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={() => setConfirmingDelete(true)} className="row-action">
            Delete
          </button>
        )}
      </div>
    </li>
  );
}
