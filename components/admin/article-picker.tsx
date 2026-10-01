"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/badge";
import type { ArticleOption } from "@/lib/admin/items/article-options";
import type { ItemSectionKey } from "@/lib/admin/items/sections";
import { matchesAll, normalize, toTerms } from "@/lib/search";

// Picks the article an item links to (a review, a write-up). Articles already
// linked from another item are shown but can't be picked, with where they're
// used. "Write the article" saves the item and opens a new linked draft.

const SHOWN = 8;

export function ArticlePicker({
  id,
  value,
  onChange,
  options,
  section,
  itemId,
  onWrite,
  writing,
  describedBy,
}: {
  id: string;
  /** The linked article's id, or "". */
  value: string;
  onChange: (postId: string) => void;
  options: ArticleOption[];
  /** This item, so its own current link doesn't count as "linked elsewhere". */
  section: ItemSectionKey;
  itemId: string | null;
  onWrite: () => void;
  /** True while the item is being saved before opening the new article. */
  writing: boolean;
  describedBy?: string;
}) {
  const [changing, setChanging] = useState(false);
  const [query, setQuery] = useState("");
  const linked = options.find((o) => o.id === value);
  const elsewhere = (o: ArticleOption) => o.linkedFrom !== null && !(o.linkedFrom.section === section && o.linkedFrom.itemId === itemId);

  if (value && !changing) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-rule px-4 py-3">
        <Badge toneKey={linked?.status === "published" ? "read" : "learning"}>{linked?.status === "published" ? "Published" : "Draft"}</Badge>
        <span className="min-w-0 flex-1 font-serif text-lg leading-snug">{linked?.title ?? "An article that no longer exists"}</span>
        <div className="flex flex-wrap gap-1 text-sm">
          {linked && (
            <Link href={`/admin/writing/${linked.id}`} className="row-action no-underline">
              Open
            </Link>
          )}
          <button type="button" onClick={() => setChanging(true)} className="row-action">
            Change
          </button>
          <button type="button" onClick={() => onChange("")} className="row-action">
            Unlink
          </button>
        </div>
      </div>
    );
  }

  const terms = toTerms(query);
  const matches = options.filter((o) => o.id !== value && (terms.length === 0 || matchesAll(normalize(o.title), terms))).slice(0, SHOWN);

  return (
    <div className="rounded-xl border border-rule px-3 py-3">
      <label className="block">
        <span className="sr-only">Search articles</span>
        <input
          id={id}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your articles"
          aria-describedby={describedBy}
          className="field"
        />
      </label>

      {matches.length === 0 ? (
        <p className="px-1 pt-3 text-sm text-fg-muted">{options.length === 0 ? "No articles yet." : "No articles match."}</p>
      ) : (
        <ul className="mt-2 divide-y divide-rule">
          {matches.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                disabled={elsewhere(o)}
                onClick={() => {
                  onChange(o.id);
                  setChanging(false);
                  setQuery("");
                }}
                className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-left hover:bg-bg-raised disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent"
              >
                <Badge toneKey={o.status === "published" ? "read" : "learning"}>{o.status === "published" ? "Published" : "Draft"}</Badge>
                <span className="min-w-0 flex-1 truncate">{o.title}</span>
                {elsewhere(o) && (
                  <span className="shrink-0 text-xs text-fg-muted">
                    linked from {o.linkedFrom!.label} · {o.linkedFrom!.itemTitle}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        {!value && (
          <button type="button" disabled={writing} onClick={onWrite} className="row-action border border-rule">
            {writing ? "Saving…" : "Write the article"}
          </button>
        )}
        {changing && (
          <button type="button" onClick={() => setChanging(false)} className="row-action">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
