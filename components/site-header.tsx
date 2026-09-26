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
        className="flex min-w-0 items-center gap-3 overflow-x-auto rounded-lg border border-rule bg-bg px-3 py-1.5 whitespace-nowrap shadow-[0_1px_3px_rgb(0_0_0/0.06)] [scrollbar-width:none] sm:gap-4 sm:px-3.5"
      >
        {site.nav.map((item) => (
          <NavLink key={item.href} href={item.href}>
            {item.label}
          </NavLink>
        ))}
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
