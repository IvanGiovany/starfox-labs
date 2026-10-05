import { formatDate } from "@/lib/format";
import type { PostSummary } from "@/lib/posts";
import { Badges } from "./badge";
import { Card } from "./card";

// An article as a card: used on the home grid and the Writing page. Sized to
// fit a square cell where it has one (measured): from `lg` on both pages, and
// at every width on home (`square`).
export function WritingCard({
  post,
  maxTags = 1,
  index,
  playedMs,
  className,
  square = false,
}: {
  post: PostSummary;
  maxTags?: number;
  index?: number;
  playedMs?: number;
  /** Its width in a grid (e.g. widened on home to fill a row). */
  className?: string;
  /** In a square cell on phones too (home): there it shows a two-line title and the date only. */
  square?: boolean;
}) {
  return (
    <Card label="Writing · Article" href={`/writing/${post.slug}`} index={index} playedMs={playedMs} className={className}>
      <div className={square ? "hidden sm:block" : ""}>
        <Badges items={post.tags.slice(0, maxTags)} />
      </div>
      <h2
        className={`shrink-0 font-serif leading-tight sm:mt-2 sm:line-clamp-3 sm:text-2xl lg:text-xl xl:text-2xl ${square ? "line-clamp-2 text-lg" : "mt-2 line-clamp-3 text-xl"}`}
      >
        {post.title}
      </h2>
      <PostDate post={post} />
      {/* Square cells on small laptops have no room for it. */}
      <p className="mt-2 hidden text-sm text-fg-muted sm:line-clamp-2 lg:hidden xl:line-clamp-2">{post.summary}</p>
    </Card>
  );
}

export function PostDate({ post }: { post: PostSummary }) {
  return (
    <time dateTime={post.publishedAt} className="mt-1.5 text-xs text-fg-muted">
      {formatDate(post.publishedAt)}
    </time>
  );
}
