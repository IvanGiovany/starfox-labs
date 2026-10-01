"use client";

import { useRef } from "react";

// The "?" button in the editor toolbar and the panel it opens: a native
// <dialog>, so Escape, focus trapping and the backdrop come for free. A side
// panel on wide screens, a bottom sheet on phones.
export function CheatSheetPanel({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        aria-label="Markdown cheat sheet"
        title="Markdown cheat sheet"
        onClick={() => dialogRef.current?.showModal()}
        className="row-action ml-auto min-w-11 shrink-0 justify-center font-semibold"
      >
        ?
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="cheat-sheet-title"
        // A click on the backdrop lands on the <dialog> itself: close.
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-2xl bg-bg text-fg shadow-2xl backdrop:bg-black/40 sm:mt-0 sm:ml-auto sm:h-dvh sm:max-h-none sm:w-[min(40rem,100%)] sm:rounded-none sm:rounded-l-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-rule bg-bg px-5 py-2">
          <h2 id="cheat-sheet-title" className="font-serif text-xl font-semibold">
            Writing cheat sheet
          </h2>
          <button type="button" onClick={() => dialogRef.current?.close()} className="row-action -mr-3">
            Close
          </button>
        </div>
        <div className="prose max-w-none px-5 pt-4 pb-10">{children}</div>
      </dialog>
    </>
  );
}
