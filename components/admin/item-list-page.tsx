import Link from "next/link";
import type { ReactNode } from "react";

// The frame of every item section's list page: heading, "New" buttons (a
// floating one on phones, within thumb reach) and the list itself.
export function ItemListPage({ title, newHref, newLabel, children }: { title: string; newHref: string; newLabel: string; children: ReactNode }) {
  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl font-semibold">{title}</h1>
        <Link href={newHref} className="button-primary hidden no-underline sm:inline-flex sm:items-center">
          {newLabel}
        </Link>
      </div>

      {children}

      <Link
        href={newHref}
        aria-label={newLabel}
        className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-accent text-3xl leading-none text-bg no-underline shadow-[0_8px_24px_-6px_var(--accent-glow)] sm:hidden"
      >
        +
      </Link>
    </>
  );
}
