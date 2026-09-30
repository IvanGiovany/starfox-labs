import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PostList, type AdminPost } from "./post-list";

// All articles, drafts included (RLS lets the admin see them). Not cached:
// the admin should always see the current state.
export default async function AdminWriting() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, title, status, tags, published_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to load articles: ${error.message}`);
  const posts: AdminPost[] = data;

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl font-semibold">Writing</h1>
        <Link href="/admin/writing/new" className="button-primary hidden no-underline sm:inline-flex sm:items-center">
          New article
        </Link>
      </div>

      <PostList posts={posts} />

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
