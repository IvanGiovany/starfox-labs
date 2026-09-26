import Link from "next/link";
import { site } from "@/lib/site";
import { NavLink } from "./nav-link";
import { ThemeToggle } from "./theme-toggle";

// Tiny, quiet header: site name left, a few text links right. No nav bar.
// RSS joins in phase 7, the account menu / "Sign in" link in phase 3.
export function SiteHeader() {
  return (
    <header className="flex items-baseline justify-between gap-4 py-8 text-sm">
      <Link href="/" className="font-serif text-lg font-semibold tracking-tight text-fg no-underline">
        {site.name}
      </Link>
      <nav aria-label="Main" className="flex items-center gap-5">
        <NavLink href="/">Home</NavLink>
        <NavLink href="/articles">Articles</NavLink>
        <ThemeToggle />
      </nav>
    </header>
  );
}
