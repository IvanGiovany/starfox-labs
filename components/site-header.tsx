import Link from "next/link";
import { Suspense } from "react";
import { site } from "@/lib/site";
import { NavLink } from "./nav-link";
import { ThemeToggle } from "./theme-toggle";

// Chester-style header: every section in one small tab bar on the left
// ("Gvan" is home), quiet social links on the right. RSS joins in the polish
// phase, the account menu / "Sign in" link with reader accounts.
export function SiteHeader() {
  const socials = [
    { label: "YouTube", href: site.links.youtube },
    { label: "GitHub", href: site.links.github },
  ].filter((link) => link.href);

  return (
    <header className="flex items-center justify-between gap-3 py-6 text-sm">
      {/* On narrow phones the tab bar scrolls sideways instead of wrapping. */}
      <nav
        aria-label="Main"
        className="relative flex min-w-0 items-center gap-3 overflow-x-auto rounded-lg border border-rule bg-bg px-3 py-1.5 whitespace-nowrap shadow-[0_1px_3px_rgb(0_0_0/0.06)] [scrollbar-width:none] sm:gap-4 sm:px-3.5"
      >
        {/*
          NavLink reads the URL to highlight the current tab. On pages whose
          URL isn't known at build time (e.g. /admin/writing/<id>), Next.js
          needs that read inside <Suspense>; the fallback is the same links
          without a highlight. Fully static pages never show the fallback.
        */}
        <Suspense
          fallback={site.nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-fg-muted no-underline hover:text-fg">
              {item.label}
            </Link>
          ))}
        >
          {site.nav.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </Suspense>
      </nav>

      <div className="flex shrink-0 items-center gap-4">
        {socials.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="hidden text-fg-muted no-underline hover:text-fg md:inline"
          >
            {link.label}
          </a>
        ))}
        <ThemeToggle />
      </div>
    </header>
  );
}
