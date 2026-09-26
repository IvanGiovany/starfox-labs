"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// A header link that marks itself as the current page. It needs the URL,
// which only the browser knows, so this small piece is a Client Component
// while the rest of the header stays on the server.
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className="text-fg-muted no-underline hover:text-fg aria-[current=page]:text-fg"
    >
      {children}
    </Link>
  );
}
