"use client";

import { useEffect, useEffectEvent, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import {
  addImageFile,
  addImageFromUrl,
  imageErrorMessage,
  imageFilesFrom,
  looksLikeImageLink,
  type AddedImage,
} from "@/lib/admin/add-image";
import type { ImageUse } from "@/lib/images/rules";
import type { MediaFolder } from "@/lib/media";

// One image field: an article's cover, or an item's picture. Four ways in, all
// ending as our own copy in the given media folder: drop a file, paste (an
// image or a link) while the box has focus, choose a file, or paste an image
// URL for the server to import.

type Busy = "preparing" | "importing" | null;

export function ImageField({
  id,
  imageUrl: value,
  onAdded,
  onRemove,
  use,
  folder,
  frameClassName = "aspect-[16/9]",
  fit = "cover",
  keepTransparency = false,
  describedBy,
  onBusyChange,
}: {
  id: string;
  /** The current image's URL, or "" for none. */
  imageUrl: string;
  /** A new image is ready (our own copy: its path and URL). */
  onAdded: (image: AddedImage) => void;
  onRemove: () => void;
  use: ImageUse;
  folder: MediaFolder;
  /** The preview frame's shape, e.g. 16:9 for an article cover. */
  frameClassName?: string;
  /** "cover" fills the frame (cropping); "contain" shows the whole image (book covers, cut-outs). */
  fit?: "cover" | "contain";
  /** Save see-through pixels even where the browser can't encode WebP (PNG instead of JPEG on white): cut-outs. */
  keepTransparency?: boolean;
  /** The field's error message, if any. */
  describedBy?: string;
  /** Tells the form an image is being prepared or uploaded, so it can hold off saving. */
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState<Busy>(null);
  const reportBusy = useEffectEvent((isBusy: boolean) => onBusyChange?.(isBusy));
  useEffect(() => {
    if (busy === null) return;
    reportBusy(true);
    return () => reportBusy(false); // done, or the field went away mid-upload
  }, [busy]);
  const [error, setError] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [link, setLink] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const latest = useRef(0); // only the newest attempt may set the cover

  async function add(kind: Exclude<Busy, null>, work: () => Promise<AddedImage>) {
    const attempt = ++latest.current;
    setBusy(kind);
    setError(null);
    try {
      const image = await work();
      if (attempt !== latest.current) return;
      onAdded(image);
      setReplacing(false);
      setUrlOpen(false);
      setLink("");
    } catch (e) {
      if (attempt === latest.current) setError(imageErrorMessage(e));
    } finally {
      if (attempt === latest.current) setBusy(null);
    }
  }

  const addFile = (file: File) => add("preparing", () => addImageFile(file, use, folder, { keepTransparency }));
  const addLink = (url: string) => add("importing", () => addImageFromUrl(url.trim(), use, folder));

  function onPaste(event: ClipboardEvent) {
    const [file] = imageFilesFrom(event.clipboardData);
    const text = event.clipboardData.getData("text/plain");
    if (file) {
      event.preventDefault();
      addFile(file);
    } else if (looksLikeImageLink(text)) {
      event.preventDefault();
      addLink(text);
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const [file] = imageFilesFrom(event.dataTransfer);
    // Dragging an image straight out of another browser tab gives its address instead of a file.
    const link = event.dataTransfer.getData("text/uri-list").split("\n").find((line) => looksLikeImageLink(line));
    if (file) addFile(file);
    else if (link) addLink(link);
    else setError("Drop an image file, or an image dragged from another tab.");
  }

  const showPicker = !value || replacing;
  const status = busy === "preparing" ? "Preparing and uploading…" : busy === "importing" ? "Downloading and saving a copy…" : null;

  return (
    <div>
      {value && (
        <div className={`relative overflow-hidden rounded-xl bg-bg-raised ${frameClassName}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a small admin preview of our own file */}
          <img src={value} alt="Current image" className={`size-full ${fit === "contain" ? "object-contain" : "object-cover"}`} />
        </div>
      )}

      {value && !replacing && (
        <div className="mt-2 flex flex-wrap gap-1 text-sm">
          <button type="button" onClick={() => setReplacing(true)} className="row-action border border-rule">
            Replace
          </button>
          <button type="button" onClick={onRemove} className="row-action">
            Remove
          </button>
        </div>
      )}

      {showPicker && (
        <div
          id={id}
          tabIndex={0}
          role="group"
          aria-label="Image: drop or paste an image, or use the buttons"
          aria-describedby={describedBy}
          aria-busy={busy !== null}
          onPaste={onPaste}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`rounded-xl border-2 border-dashed px-4 py-5 text-sm transition-colors outline-none focus-visible:border-accent ${
            value ? "mt-2" : ""
          } ${dragging ? "border-accent bg-accent-soft" : "border-rule"} ${busy ? "opacity-70" : ""}`}
        >
          <p className="text-fg-muted">
            {status ?? "Drop an image here, or click this box and paste one (Ctrl+V), image or link."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy !== null} onClick={() => fileInput.current?.click()} className="row-action border border-rule">
              Choose file
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => setUrlOpen((open) => !open)}
              aria-expanded={urlOpen}
              className="row-action border border-rule"
            >
              Paste image URL
            </button>
            {replacing && (
              <button type="button" disabled={busy !== null} onClick={() => setReplacing(false)} className="row-action">
                Cancel
              </button>
            )}
          </div>

          {urlOpen && (
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="min-w-0 flex-1 basis-64">
                <span className="sr-only">Image URL</span>
                <input
                  type="url"
                  inputMode="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault(); // import, don't submit the form
                      if (link.trim()) addLink(link);
                    }
                  }}
                  placeholder="https://images.unsplash.com/…"
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="field"
                />
              </label>
              <button type="button" disabled={busy !== null || !link.trim()} onClick={() => addLink(link)} className="button-primary">
                Import
              </button>
            </div>
          )}

          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) addFile(file);
              e.target.value = ""; // choosing the same file again still triggers a change
            }}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
