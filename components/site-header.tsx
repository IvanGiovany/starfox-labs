import Link from "next/link";
import { Suspense } from "react";
import { site } from "@/lib/site";
import { AccountMenu } from "./account-menu";
import { HeaderExtras } from "./header-extras";
import { NavLink, TAB_CLASS } from "./nav-link";
import { TabBar } from "./tab-bar";
import { ThemeToggle } from "./theme-toggle";

// Chester-style header: every section in one small frosted tab bar on the
// left ("Gvan" is home), quiet social links on the right. It sticks to the
// top while the page scrolls; only the tab bar takes clicks, so the space
// around it doesn't block the content underneath. Then the RSS feed (as
// quiet as the socials), the theme toggle, and last "Sign in" or the account menu.
export function SiteHeader() {
  const socials = [
    { label: "YouTube", href: site.links.youtube },
    { label: "GitHub", href: site.links.github },
  ].filter((link) => link.href);

  return (
    <header className="pointer-events-none sticky top-0 z-20 flex items-center justify-between gap-3 py-4 text-sm">
      <TabBar>
        {/*
          NavLink reads the URL to highlight the current tab. On pages whose
          URL isn't known at build time (e.g. /admin/writing/<id>), Next.js
          needs that read inside <Suspense>; the fallback is the same links
          without a highlight. Fully static pages never show the fallback.
        */}
        <Suspense
          fallback={site.nav.map((item) => (
            <Link key={item.href} href={item.href} className={TAB_CLASS}>
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
      </TabBar>

      <HeaderExtras>
        {socials.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="hidden text-fg-muted no-underline transition-colors hover:text-fg md:inline"
          >
            {link.label}
          </a>
        ))}
        {/* A file, not a page: a plain link (no client-side navigation). */}
        <a href="/rss.xml" className="hidden text-fg-muted no-underline transition-colors hover:text-fg md:inline">
          RSS
        </a>
        <ThemeToggle />
        {/* Reads the URL, so (like NavLink) it sits inside <Suspense>. */}
        <Suspense fallback={<span className="block size-6" aria-hidden="true" />}>
          <AccountMenu />
        </Suspense>
      </HeaderExtras>
    </header>
  );
}
