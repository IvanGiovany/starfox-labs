"use client";

import { useState } from "react";
import { Badge } from "@/components/badge";

type TagInputProps = {
  id: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  /** Known tags, most used first. Matching ones show as tap-to-add buttons. */
  suggestions?: string[];
  /** Cleans up what was typed; return "" to reject it. */
  normalize: (text: string) => string;
  max: number;
  invalid?: boolean;
  describedBy?: string;
};

// Chips in a text field: Enter or comma adds a tag, Backspace in the empty
// field removes the last one, pasting "a, b, c" adds all three. Commas are
// handled in onChange as well as onKeyDown, because Android keyboards often
// report every key as "Unidentified".
export function TagInput({ id, tags, onChange, suggestions = [], normalize, max, invalid, describedBy }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const full = tags.length >= max;

  function add(raw: string[]) {
    const next = [...tags];
    for (const text of raw) {
      const tag = normalize(text);
      if (tag && !next.includes(tag) && next.length < max) next.push(tag);
    }
    if (next.length !== tags.length) onChange(next);
  }

  function commitDraft() {
    if (draft.trim()) add([draft]);
    setDraft("");
  }

  function handleChange(value: string) {
    if (!/[,\n]/.test(value)) return setDraft(value);
    const parts = value.split(/[,\n]/);
    const rest = parts.pop() ?? "";
    add(parts);
    setDraft(rest);
  }

  const query = normalize(draft);
  const matches = suggestions.filter((tag) => !tags.includes(tag) && (query === "" || tag.includes(query))).slice(0, 6);

  return (
    <div>
      <div className="field flex flex-wrap items-center gap-1.5 py-1.5 focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-accent">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            aria-label={`Remove tag ${tag}`}
            className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded text-fg-muted hover:text-fg"
          >
            <Badge>{tag}</Badge>
            <span aria-hidden>×</span>
          </button>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // add the tag, don't submit the form
              commitDraft();
            } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={commitDraft}
          disabled={full}
          placeholder={full ? `${max} tags is the limit` : tags.length === 0 ? "Type a tag, then Enter" : ""}
          enterKeyHint="enter"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="min-h-8 min-w-32 flex-1 bg-transparent outline-none"
        />
      </div>

      {!full && matches.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-sm text-fg-muted">
          <span className="mr-1">{query ? "Matching:" : "Used before:"}</span>
          {matches.map((tag) => (
            <button
              key={tag}
              type="button"
              // Keep focus in the text field, so tapping a suggestion doesn't close the phone keyboard.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                add([tag]);
                setDraft("");
              }}
              className="row-action px-2"
            >
              + {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
