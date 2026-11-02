import { getImageProps, type StaticImageData } from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BANNER_QUALITY, BANNER_SIZES, SECTION_BANNERS } from "@/lib/section-banners";
import { site } from "@/lib/site";
import { BannerPrefetch, type BannerPrefetchTarget } from "./banner-prefetch";
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
    <header className="page-column pointer-events-none sticky top-0 z-20 flex items-center justify-between gap-3 py-4 text-sm">
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
      <BannerPrefetch targets={BANNER_PREFETCH} />
    </header>
  );
}

// For each section page, the srcset its banner images will use (character
// first), worked out once with the same props as <Image> in section-banner.tsx.
const BANNER_PREFETCH: BannerPrefetchTarget[] = Object.entries(SECTION_BANNERS).map(([section, art]) => ({
  href: `/${section}`,
  images: [art.layers?.front ?? art.image, art.layers?.back]
    .filter((src): src is StaticImageData => src !== undefined)
    .map((src) => {
      const { props } = getImageProps({ src, alt: "", fill: true, sizes: BANNER_SIZES, quality: BANNER_QUALITY });
      return { srcSet: props.srcSet ?? "", sizes: props.sizes ?? BANNER_SIZES };
    }),
}));
