import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
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

export const metadata: Metadata = {
  title: {
    default: "Starfox Labs",
    template: "%s · Starfox Labs",
  },
  description: "Ivan's notes on software, and a few other things.",
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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-bg-raised focus:px-3 focus:py-1.5"
        >
          Skip to content
        </a>
        {/* One column for everything, so all pages line up. */}
        <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5">
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
