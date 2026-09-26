import { cacheLife } from "next/cache";
import { site } from "@/lib/site";

export async function SiteFooter() {
  // The year comes from the clock, so it's cached (refreshed daily) and can
  // still be part of the prerendered page.
  "use cache";
  cacheLife("days");

  const links = [
    { label: "YouTube", href: site.links.youtube },
    { label: "GitHub", href: site.links.github },
  ].filter((link) => link.href);

  return (
    <footer className="mt-24 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-rule py-8 text-sm text-fg-muted">
      <p>
        © {new Date().getFullYear()} {site.name}
      </p>
      <ul className="flex gap-5">
        {links.map((link) => (
          <li key={link.label}>
            <a href={link.href} className="text-fg-muted no-underline hover:text-fg">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </footer>
  );
}
