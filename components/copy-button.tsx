"use client";

import { useRef, useState } from "react";

// Copies the code block it sits in. It finds the code through the DOM
// (the nearest <figure>), so the server doesn't have to pass the code twice.
export function CopyButton() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function copy(event: React.MouseEvent<HTMLButtonElement>) {
    const code = event.currentTarget.closest("figure")?.querySelector("pre")?.innerText;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.replace(/\n$/, ""));
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked (e.g. insecure context); nothing useful to show.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="cursor-pointer rounded px-1.5 py-0.5 text-fg-muted transition-colors hover:text-fg"
    >
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
