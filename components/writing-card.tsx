import { formatDate } from "@/lib/format";
import type { PostSummary } from "@/lib/posts";
import { Badges } from "./badge";
import { Card } from "./card";

// An article as a card: used on the home grid and the Writing page.
export function WritingCard({ post, maxTags = 1, index, playedMs }: { post: PostSummary; maxTags?: number; index?: number; playedMs?: number }) {
  return (
    <Card label="Writing · Article" href={`/writing/${post.slug}`} index={index} playedMs={playedMs}>
      <Badges items={post.tags.slice(0, maxTags)} />
      <h2 className="mt-2 line-clamp-3 font-serif text-xl leading-tight sm:text-2xl xl:text-[1.75rem]">{post.title}</h2>
      <PostDate post={post} />
      <p className="mt-2 line-clamp-3 hidden text-sm text-fg-muted sm:block">{post.summary}</p>
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
