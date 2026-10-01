"use client";

import { useRef, useState } from "react";

// Opened by the toolbar's Image button: choose files, or import an image from
// a URL. (Pasting or dropping images straight into the text works without it.)
export function BodyImagePanel({
  onFiles,
  onUrl,
  onClose,
}: {
  onFiles: (files: File[]) => void;
  onUrl: (url: string) => void;
  onClose: () => void;
}) {
  const [link, setLink] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function importLink() {
    if (!link.trim()) return;
    onUrl(link.trim());
    setLink("");
    onClose();
  }

  return (
    <div className="mt-1.5 rounded-xl border border-rule bg-bg px-3 py-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => fileInput.current?.click()} className="row-action border border-rule">
          Choose files
        </button>
        <label className="min-w-0 flex-1 basis-56">
          <span className="sr-only">Image URL</span>
          <input
            type="url"
            inputMode="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault(); // import, don't submit the form
                importLink();
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
            placeholder="Paste an image URL"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="field"
          />
        </label>
        <button type="button" disabled={!link.trim()} onClick={importLink} className="button-primary">
          Import
        </button>
        <button type="button" onClick={onClose} className="row-action">
          Close
        </button>
      </div>
      <p className="mt-2 text-fg-muted">
        Images go where the cursor is. You can also paste or drop images straight into the text.
      </p>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length > 0) {
            onFiles(files);
            onClose();
          }
        }}
      />
    </div>
  );
}
