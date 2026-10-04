"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

// The header's tab bar (chester.how style): a frosted pill-shaped bar that
// drops in from above when the site loads, with a soft highlight that slides
// under whichever tab the mouse points at and fades away when it leaves.
// The highlight is moved directly (no re-render): its width and position
// follow the tab, eased by CSS over 150 ms.
export function TabBar({ children }: { children: ReactNode }) {
  const nav = useRef<HTMLElement>(null);
  const pill = useRef<HTMLSpanElement>(null);

  function pointTo(event: PointerEvent) {
    // Touch has no hover: a tap would leave the highlight stuck on the tab.
    if (event.pointerType !== "mouse") return;
    const link = (event.target as HTMLElement).closest("a");
    const highlight = pill.current;
    if (!link || !highlight || !nav.current?.contains(link)) return;
    highlight.style.width = `${link.offsetWidth}px`;
    highlight.style.transform = `translateX(${link.offsetLeft}px)`;
    highlight.style.opacity = "1";
  }

  return (
    <nav
      ref={nav}
      aria-label="Main"
      onPointerOver={pointTo}
      onPointerLeave={() => pill.current && (pill.current.style.opacity = "0")}
      // On narrow phones the tab bar scrolls sideways instead of wrapping.
      className="header-in pointer-events-auto relative isolate flex min-w-0 items-center overflow-x-auto rounded-lg border border-rule bg-(--frost) p-1 whitespace-nowrap shadow-md backdrop-blur-md [scrollbar-width:none]"
    >
      <span
        ref={pill}
        aria-hidden="true"
        className="absolute left-0 -z-10 h-7 w-0 rounded bg-bg-raised opacity-0 transition-[width,transform,opacity]"
      />
      {children}
    </nav>
  );
}
