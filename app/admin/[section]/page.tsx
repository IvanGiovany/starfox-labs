import { notFound } from "next/navigation";
import { Suspense } from "react";
import { adminSections } from "@/lib/admin/sections";

// Placeholder for sections whose forms arrive in step 2.4. The sections are a
// fixed list, so each placeholder is prerendered. Any other address (e.g.
// /admin/foo) reads its params at request time, which needs the page's own
// <Suspense> (see app/admin/writing/page.tsx); it then shows the 404.
export function generateStaticParams() {
  return adminSections.filter((s) => !s.ready).map((s) => ({ section: s.key }));
}

export default function AdminSectionPlaceholder({ params }: PageProps<"/admin/[section]">) {
  return (
    <Suspense>
      <Placeholder params={params} />
    </Suspense>
  );
}

async function Placeholder({ params }: { params: PageProps<"/admin/[section]">["params"] }) {
  const { section } = await params;
  const match = adminSections.find((s) => s.key === section && !s.ready);
  if (!match) notFound();

  return (
    <p className="text-fg-muted">
      Adding and editing {match.label.toLowerCase()} arrives in the next step of the admin.
    </p>
  );
}
