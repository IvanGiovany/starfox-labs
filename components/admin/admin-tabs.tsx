"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { adminSections } from "@/lib/admin/sections";

// Section tabs across the top of /admin. Like the site header, the row
// scrolls sideways on phones rather than wrapping.
//
// Highlighting the current tab reads the URL, which Next.js requires inside
// <Suspense> on pages with unknown URLs (e.g. /admin/writing/<id>). The
// fallback is the same tabs without a highlight.
export function AdminTabs() {
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
    <nav aria-label="Admin sections" className="-mx-1 mt-4 overflow-x-auto [scrollbar-width:none]">
      <ul className="flex min-w-max gap-1 px-1">
        {adminSections.map((section) => {
          const href = `/admin/${section.key}`;
          const active = activePath !== null && (activePath === href || activePath.startsWith(`${href}/`));
          return (
            <li key={section.key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex min-h-11 items-center rounded-lg px-3.5 text-sm text-fg-muted no-underline hover:bg-bg-raised hover:text-fg aria-[current=page]:bg-bg-raised aria-[current=page]:text-fg"
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
