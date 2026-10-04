"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** One tab in the header's tab bar (also used for the links shown while the URL is read). */
export const TAB_CLASS = "rounded px-2 py-1 text-fg-muted no-underline transition-colors hover:text-fg";

// A header link that marks itself as the current page. It needs the URL,
// which only the browser knows, so this small piece is a Client Component
// while the rest of the header stays on the server.
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
  const ref = useRef<HTMLAnchorElement>(null);

  // On phones the tab bar scrolls sideways; keep the current tab in view
  // (e.g. "Hobbies" at the far end). Only the tab bar scrolls, not the page.
  useEffect(() => {
    const link = ref.current;
    const bar = link?.parentElement;
    if (!isActive || !link || !bar || bar.scrollWidth <= bar.clientWidth) return;
    bar.scrollLeft = link.offsetLeft - (bar.clientWidth - link.offsetWidth) / 2;
  }, [isActive]);

  return (
    <Link
      ref={ref}
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`${TAB_CLASS} aria-[current=page]:text-fg`}
    >
      {children}
    </Link>
  );
}
