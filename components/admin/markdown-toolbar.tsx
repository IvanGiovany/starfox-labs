"use client";

import type { KeyboardEvent, RefObject } from "react";

// Toolbar buttons and shortcuts for a plain markdown <textarea>. Each action
// wraps or prefixes the selected text and then selects the part you'd type
// next (e.g. the URL of a new link).

type Textarea = HTMLTextAreaElement;

/**
 * Replaces [from, to) with `text` and selects [selectFrom, selectTo).
 * execCommand("insertText") is deprecated but still the only way to edit a
 * textarea that keeps Ctrl+Z working and fires React's onChange. If a browser
 * ever drops it, setRangeText still makes the edit (without undo).
 */
export function replaceRange(ta: Textarea, from: number, to: number, text: string, selectFrom: number, selectTo = selectFrom) {
  ta.focus();
  ta.setSelectionRange(from, to);
  if (!document.execCommand("insertText", false, text)) {
    ta.setRangeText(text, from, to, "end");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }
  ta.setSelectionRange(selectFrom, selectTo);
}

/** **bold**, _italic_, `code`: wraps the selection, or a placeholder that ends up selected. */
function wrap(ta: Textarea, before: string, after: string, placeholder: string) {
  const { selectionStart: start, selectionEnd: end, value } = ta;
  const inner = value.slice(start, end) || placeholder;
  const innerStart = start + before.length;
  replaceRange(ta, start, end, before + inner + after, innerStart, innerStart + inner.length);
}

/** "## ", "- ", "> " on every selected line; removes it if all lines already have it. */
function prefixLines(ta: Textarea, prefix: string) {
  const { selectionStart: start, selectionEnd: end, value } = ta;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const newline = value.indexOf("\n", end);
  const lineEnd = newline === -1 ? value.length : newline;

  const lines = value.slice(lineStart, lineEnd).split("\n");
  const remove = lines.every((line) => line.startsWith(prefix));
  const next = lines.map((line) => (remove ? line.slice(prefix.length) : prefix + line)).join("\n");

  if (start === end) {
    const cursor = Math.max(lineStart, start + (remove ? -prefix.length : prefix.length));
    replaceRange(ta, lineStart, lineEnd, next, cursor);
  } else {
    replaceRange(ta, lineStart, lineEnd, next, lineStart, lineStart + next.length);
  }
}

/** A fenced code block on its own lines around the selection. */
function codeBlock(ta: Textarea) {
  const { selectionStart: start, selectionEnd: end, value } = ta;
  const inner = value.slice(start, end) || "code";
  const open = `${start > 0 && value[start - 1] !== "\n" ? "\n" : ""}\`\`\`\n`;
  const close = `\n\`\`\`${end < value.length && value[end] !== "\n" ? "\n" : ""}`;
  const innerStart = start + open.length;
  replaceRange(ta, start, end, open + inner + close, innerStart, innerStart + inner.length);
}

/** [text](url): with text selected, selects the URL to type next; otherwise selects "text". */
function link(ta: Textarea, image = false) {
  const { selectionStart: start, selectionEnd: end, value } = ta;
  const selected = value.slice(start, end);
  const label = selected || (image ? "description" : "text");
  const url = "https://";
  const open = image ? "![" : "[";
  const text = `${open}${label}](${url})`;
  if (selected) {
    const urlStart = start + open.length + label.length + 2;
    replaceRange(ta, start, end, text, urlStart, urlStart + url.length);
  } else {
    replaceRange(ta, start, end, text, start + open.length, start + open.length + label.length);
  }
}

const ACTIONS = [
  { label: "H", name: "Heading", run: (ta: Textarea) => prefixLines(ta, "## "), className: "font-serif font-semibold" },
  { label: "B", name: "Bold", shortcut: "b", run: (ta: Textarea) => wrap(ta, "**", "**", "bold text"), className: "font-bold" },
  { label: "I", name: "Italic", shortcut: "i", run: (ta: Textarea) => wrap(ta, "_", "_", "italic text"), className: "font-serif italic" },
  { label: "Link", name: "Link", shortcut: "k", run: (ta: Textarea) => link(ta) },
  { label: "`c`", name: "Inline code", shortcut: "e", run: (ta: Textarea) => wrap(ta, "`", "`", "code"), className: "font-mono" },
  { label: "{ }", name: "Code block", run: codeBlock, className: "font-mono" },
  { label: "• List", name: "List", run: (ta: Textarea) => prefixLines(ta, "- ") },
  { label: "❝ Quote", name: "Quote", run: (ta: Textarea) => prefixLines(ta, "> ") },
  { label: "Image", name: "Image", run: (ta: Textarea) => link(ta, true) },
];

/** Ctrl/⌘ + B, I, K, E inside the textarea. */
export function handleMarkdownShortcut(event: KeyboardEvent<Textarea>) {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
  const action = ACTIONS.find((a) => a.shortcut === event.key.toLowerCase());
  if (!action) return;
  event.preventDefault();
  action.run(event.currentTarget);
}

export function MarkdownToolbar({
  textareaRef,
  onImage,
  imageOpen,
  children,
}: {
  textareaRef: RefObject<Textarea | null>;
  /** Replaces the Image button's markdown template, e.g. with an upload panel. */
  onImage?: () => void;
  imageOpen?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div role="toolbar" aria-label="Formatting" className="flex items-center gap-0.5 overflow-x-auto text-sm">
      {ACTIONS.map((action) => (
        <button
          key={action.name}
          type="button"
          aria-label={action.name}
          title={action.shortcut ? `${action.name} (Ctrl+${action.shortcut.toUpperCase()})` : action.name}
          // Keep the focus (and the phone keyboard) in the textarea.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (action.name === "Image" && onImage) return onImage();
            if (textareaRef.current) action.run(textareaRef.current);
          }}
          aria-expanded={action.name === "Image" && onImage ? Boolean(imageOpen) : undefined}
          className={`row-action min-w-11 shrink-0 justify-center px-2.5 ${action.className ?? ""}`}
        >
          {action.label}
        </button>
      ))}
      {children}
    </div>
  );
}
