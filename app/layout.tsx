import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { ViewTransition } from "react";
import { InlineScript } from "@/components/inline-script";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { openGraphDefaults, site } from "@/lib/site";
import "./globals.css";

// Clean sans for UI and metadata.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Warm serif for headings and reading. `opsz` lets the font adjust its
// shapes for small vs. large sizes; italic is used in quotes and emphasis.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

// Site-wide defaults. Each page sets its own canonical URL and preview
// details (a canonical here would be inherited by every page and point them
// all at the home page). Preview images come from opengraph-image.tsx files.
// metadataBase turns relative URLs into the absolute ones previews require.
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description: "Ivan's notes on software, projects, and music as Spektral.",
  openGraph: openGraphDefaults,
  twitter: { card: "summary_large_image" },
};

// Runs during HTML parsing, before first paint, so a saved theme never
// flashes the wrong colors. With no saved choice, CSS follows the OS.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={themeScript} />
        {/* Lets feed readers find the RSS feed from any page. (Here rather than in
            metadata: each page sets its own `alternates`, which would replace it.) */}
        <link rel="alternate" type="application/rss+xml" title={site.name} href="/rss.xml" />
      </head>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-bg-raised focus:px-3 focus:py-1.5"
        >
          Skip to content
        </a>
        {/* One container for everything, so all pages line up. Card grids use
            its full width; reading pages center a narrower column.
            Width and padding come from --page-max / --page-pad in globals.css. */}
        <div className="mx-auto flex min-h-dvh w-full max-w-[calc(var(--page-max)+2*var(--page-pad))] flex-col px-(--page-pad)">
          <SiteHeader />
          <main id="main" className="flex-1">
            {/* Page transitions: on navigation only the page content cross-fades
                (`page-fade` in globals.css); header, footer and background hold
                still. The admin, settings and sign-in pages switch instantly
                (they carry data-instant-navigation). One wrapper element, so the
                content fades as one piece. */}
            <ViewTransition default="page-fade">
              <div>{children}</div>
            </ViewTransition>
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
