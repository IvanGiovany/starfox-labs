"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const TABS = [
  { label: "Profile", href: "/settings" },
  { label: "Appearance", href: "/settings/appearance" },
];

// The Settings tabs, styled like the admin's. Highlighting the current tab
// reads the URL, which Next.js wants inside <Suspense>; the fallback is the
// same tabs without a highlight.
export function SettingsTabs() {
  return (
    <Suspense fallback={<TabList activePath={null} />}>
      <CurrentTabList />
    </Suspense>
  );
}

function CurrentTabList() {
  return <TabList activePath={usePathname()} />;
}

function TabList({ activePath }: { activePath: string | null }) {
  return (
    <nav aria-label="Settings" className="-mx-1 overflow-x-auto [scrollbar-width:none]">
      <ul className="flex min-w-max gap-1 px-1">
        {TABS.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              aria-current={activePath === tab.href ? "page" : undefined}
              className="flex min-h-11 items-center rounded-lg px-3.5 text-sm text-fg-muted no-underline hover:bg-bg-raised hover:text-fg aria-[current=page]:bg-bg-raised aria-[current=page]:text-fg"
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
