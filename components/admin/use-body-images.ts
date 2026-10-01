"use client";

import { useRef, useState, type ClipboardEvent, type DragEvent, type RefObject } from "react";
import { replaceRange } from "@/components/admin/markdown-toolbar";
import { addImageFile, addImageFromUrl, imageErrorMessage, imageFilesFrom, looksLikeImageLink, type AddedImage } from "@/lib/admin/add-image";
import { randomId } from "@/lib/admin/image-rules";

// Images in the article body: pasted, dropped, picked, or imported from a URL.
//
// Each image first appears as a placeholder line at the cursor, so it's clear
// something is happening and where the image will go:
//     ⏳ Uploading “photo.jpg” (k3f9)…
// When it's ready the placeholder becomes ![photo](…/abc.webp#2400x1600). If
// it fails, the placeholder is removed and the error is reported. If Ivan has
// deleted the placeholder in the meantime, nothing is inserted.

type Options = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** Changes the body through React state (used when the text area isn't focused). */
  updateBody: (change: (body: string) => string) => void;
  onError: (message: string) => void;
};

/** "my-photo_2.jpg" → "my photo 2". Pasted screenshots are all called "image", so they get no alt text. */
function altFromName(name: string): string {
  const base = decodeURIComponent(name.split(/[?#]/)[0].split("/").pop() ?? "")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return /^(image|img|screenshot|untitled|photo-\d+)$/i.test(base) || /^[0-9a-f-]{16,}$/i.test(base) ? "" : base.slice(0, 80);
}

/** Alt text can't contain "]" or line breaks without breaking the markdown. */
function safeAlt(alt: string): string {
  return alt.replace(/[[\]\n\r]/g, " ").trim();
}

export function useBodyImages({ textareaRef, updateBody, onError }: Options) {
  const [pending, setPending] = useState(0);
  const counter = useRef(0);

  /** Inserts placeholders at the cursor, each on its own line. Returns them in order. */
  function insertPlaceholders(names: string[]): string[] {
    const ta = textareaRef.current;
    const tokens = names.map((name) => `⏳ Uploading “${name.replace(/[“”\n]/g, "")}” (${(++counter.current).toString(36)}${randomId(2)})…`);
    if (!ta) return tokens;

    const { selectionStart: start, selectionEnd: end, value } = ta;
    const before = start === 0 || value.slice(0, start).endsWith("\n\n") ? "" : value[start - 1] === "\n" ? "\n" : "\n\n";
    const after = end === value.length || value.slice(end).startsWith("\n\n") ? "" : value[end] === "\n" ? "\n" : "\n\n";
    const text = before + tokens.join("\n\n") + after;
    const caret = start + before.length + tokens.join("\n\n").length;
    replaceRange(ta, start, end, text, caret);
    return tokens;
  }

  /** Swaps a placeholder for its final text, without moving Ivan's cursor or stealing focus. */
  function finish(token: string, replacement: string, altLength: number) {
    const ta = textareaRef.current;
    const at = ta?.value.indexOf(token) ?? -1;
    if (!ta || at === -1) return; // deleted meanwhile: respect that

    if (document.activeElement !== ta) {
      updateBody((body) => body.replace(token, () => replacement));
      return;
    }
    const { selectionStart: s, selectionEnd: e } = ta;
    const shift = replacement.length - token.length;
    const move = (pos: number) => (pos <= at ? pos : pos >= at + token.length ? pos + shift : at + replacement.length);
    // Cursor still right after the placeholder (Ivan is waiting for it): select the
    // alt text (or put the cursor where it goes) so he can type a description.
    if (s === e && s === at + token.length) {
      replaceRange(ta, at, at + token.length, replacement, at + 2, at + 2 + altLength);
    } else {
      replaceRange(ta, at, at + token.length, replacement, move(s), move(e));
    }
  }

  /** A failed image: remove its placeholder and the blank line it brought. */
  function drop(token: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const value = ta.value;
    const at = value.indexOf(token);
    if (at === -1) return;
    const end = value.startsWith("\n\n", at + token.length) ? at + token.length + 2 : at + token.length;
    if (document.activeElement === ta) {
      replaceRange(ta, at, end, "", Math.min(ta.selectionStart, at));
    } else {
      updateBody((body) => body.replace(value.slice(at, end), ""));
    }
  }

  async function run(token: string, alt: string, work: () => Promise<AddedImage>) {
    setPending((n) => n + 1);
    try {
      const image = await work();
      const text = safeAlt(alt);
      finish(token, `![${text}](${image.url})`, text.length);
    } catch (error) {
      drop(token);
      onError(imageErrorMessage(error));
    } finally {
      setPending((n) => n - 1);
    }
  }

  function addFiles(files: File[]) {
    if (files.length === 0) return;
    const tokens = insertPlaceholders(files.map((file) => file.name || "image"));
    files.forEach((file, i) => run(tokens[i], altFromName(file.name), () => addImageFile(file, "body", "writing")));
  }

  function addUrl(url: string) {
    const [token] = insertPlaceholders([url.split(/[?#]/)[0].split("/").pop() || "image"]);
    run(token, altFromName(url), () => addImageFromUrl(url.trim(), "body", "writing"));
  }

  /** Paste: image files become uploads. Text (including links) pastes as text, as usual. */
  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = imageFilesFrom(event.clipboardData);
    if (files.length === 0) return;
    event.preventDefault();
    addFiles(files);
  }

  /**
   * Drop: image files are uploaded; an image dragged out of another browser tab
   * (it arrives as HTML with an <img>) is imported by its address. Anything else,
   * like dragged text or an ordinary link, drops as text, as usual.
   */
  function onDrop(event: DragEvent<HTMLTextAreaElement>) {
    const files = imageFilesFrom(event.dataTransfer);
    const html = event.dataTransfer.getData("text/html");
    const link = event.dataTransfer
      .getData("text/uri-list")
      .split("\n")
      .find((line) => looksLikeImageLink(line));
    if (files.length > 0) {
      event.preventDefault();
      textareaRef.current?.focus();
      addFiles(files);
    } else if (link && /<img\b/i.test(html)) {
      event.preventDefault();
      textareaRef.current?.focus();
      addUrl(link);
    }
  }

  return { pending, addFiles, addUrl, onPaste, onDrop };
}
