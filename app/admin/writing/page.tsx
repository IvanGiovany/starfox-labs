import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PostList, type AdminPost } from "./post-list";

// The heading and buttons are static; the list reads the session and the
// database, so it streams in behind its own <Suspense>. That boundary has to
// be in the page: a client navigation inside /admin only re-renders below
// app/admin/layout.tsx, so the layout's boundary (and its admin check)
// doesn't cover it. See "Notes for the next session" in CLAUDE.md.
export default function AdminWriting() {
  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl font-semibold">Writing</h1>
        <Link href="/admin/writing/new" className="button-primary hidden no-underline sm:inline-flex sm:items-center">
          New article
        </Link>
      </div>

      <Suspense fallback={<p className="py-6 text-fg-muted">Loading articles…</p>}>
        <Articles />
      </Suspense>

      {/* On phones the main action floats within thumb reach. */}
      <Link
        href="/admin/writing/new"
        aria-label="New article"
        className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-accent text-3xl leading-none text-bg no-underline shadow-[0_8px_24px_-6px_var(--accent-glow)] sm:hidden"
      >
        +
      </Link>
    </>
  );
}

// All articles, drafts included (RLS lets the admin see them). Not cached:
// the admin should always see the current state.
async function Articles() {
  await requireAdmin("/admin/writing");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, title, status, tags, published_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to load articles: ${error.message}`);
  const posts: AdminPost[] = data;
  return <PostList posts={posts} />;
}
