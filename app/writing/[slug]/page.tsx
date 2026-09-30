import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { getPostBySlug, getPublishedPosts, readingTime } from "@/lib/posts";

// One article: a simple reading column, text-first (no cards), styled after
// chester.how's blog: big serif title, a quiet italic date line, a short rule.

// Every published article is prerendered at build time. Articles published
// later are rendered on their first visit and then cached. With Cache
// Components this list must not be empty, so with no posts we return a slug
// that simply renders the 404.
export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.length > 0 ? posts.map((post) => ({ slug: post.slug })) : [{ slug: "no-posts-yet" }];
}

export async function generateMetadata({ params }: PageProps<"/writing/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Not found" };
  return { title: post.title, description: post.summary };
}

export default async function ArticlePage({ params }: PageProps<"/writing/[slug]">) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const body = await renderMarkdown(post.bodyMd);
  const minutes = readingTime(post.bodyMd);

  return (
    <article className="mx-auto max-w-[42rem] pt-6 pb-8 sm:pt-10">
      <Link href="/writing" className="text-sm text-fg-muted no-underline hover:text-fg">
        ← writing.
      </Link>

      <header className="mt-8 sm:mt-10">
        <h1 className="font-serif text-[clamp(2.4rem,5.5vw,3.75rem)] leading-[1.05] font-semibold tracking-[-0.02em] text-balance">
          {post.title}
        </h1>
        <p className="mt-5 font-serif text-lg text-fg-muted italic">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          <span aria-hidden="true"> · </span>
          {minutes} min read
        </p>
        {post.tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
            {post.tags.map((tag) => (
              <li key={tag}>
                <Link href={`/writing?tag=${encodeURIComponent(tag)}`} className="no-underline hover:opacity-80">
                  <Badge>{tag}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <hr className="mt-8 w-24 border-rule" />
      </header>

      {post.coverImageUrl && (
        // Slightly wider than the text on large screens, so it doesn't feel boxed in.
        <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-xl bg-bg-raised lg:-mx-16">
          <Image
            src={post.coverImageUrl}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 800px, 100vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="prose mt-10 max-w-none">{body}</div>
    </article>
  );
}
