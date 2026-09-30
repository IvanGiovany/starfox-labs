import Link from "next/link";
import { getPublishedPosts } from "@/lib/posts";
import { site } from "@/lib/site";
import { SectionHeader } from "./section-header";
import { WritingCard } from "./writing-card";

// Shared body for the 404 pages: says what happened, offers the next step,
// and shows the latest writing so the page is never a dead end.
export async function NotFoundPage({ children }: { children: React.ReactNode }) {
  const latest = (await getPublishedPosts()).slice(0, 4);

  return (
    <>
      {/* not-found files can't export metadata; React places this <title> in <head>. */}
      <title>{`Page not found · ${site.name}`}</title>

      <SectionHeader title="lost">{children}</SectionHeader>

      <p className="-mt-4 mb-14 flex flex-wrap gap-x-6 gap-y-2 text-base sm:-mt-6">
        <Link href="/writing">Browse all writing</Link>
        <Link href="/">Go to the home page</Link>
      </p>

      {latest.length > 0 && (
        <section aria-labelledby="latest-heading" className="pb-8">
          <h2 id="latest-heading" className="mb-4 text-sm text-fg-muted">
            Latest writing
          </h2>
          <div className="grid grid-cols-2 gap-(--grid-gap) sm:auto-rows-[minmax(11rem,auto)] lg:grid-cols-4 lg:auto-rows-(--cell)">
            {latest.map((post) => (
              <WritingCard key={post.slug} post={post} maxTags={2} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
