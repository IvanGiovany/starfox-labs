import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { formatDate } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { articleStaticParams, getPostBySlug, getPublishedPosts, readingTime, type PostSummary } from "@/lib/posts";
import { openGraphDefaults, site } from "@/lib/site";
import { youtubeId } from "@/lib/youtube";

// One article: a simple reading column, text-first (no cards), styled after
// chester.how's blog: big serif title, a quiet italic date line, a short rule.

// Every published article is prerendered at build time; articles published
// later are rendered on their first visit and then cached.
export const generateStaticParams = articleStaticParams;

// Title, description and link-preview tags. The preview image itself comes
// from opengraph-image.tsx in this folder; Next.js adds its tags automatically.
export async function generateMetadata({ params }: PageProps<"/writing/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Not found" };

  const url = `/writing/${post.slug}`;
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: url },
    openGraph: {
      ...openGraphDefaults,
      type: "article",
      url,
      title: post.title,
      description: post.summary,
      publishedTime: post.publishedAt,
      authors: [site.author],
      tags: post.tags,
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.summary },
  };
}

export default async function ArticlePage({ params }: PageProps<"/writing/[slug]">) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const [body, { older, newer }] = await Promise.all([renderMarkdown(post.bodyMd), neighbours(slug)]);
  const minutes = readingTime(post.bodyMd);
  const videoId = post.youtubeUrl ? youtubeId(post.youtubeUrl) : null;

  return (
    <article className="mx-auto max-w-[42rem] pt-6 pb-8 sm:pt-10">
      <Link href="/writing" className="text-sm text-fg-muted no-underline hover:text-fg">
        ← writing.
      </Link>

      <header className="reveal mt-8 sm:mt-10">
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

      {/* Cover and video are slightly wider than the text on large screens. */}
      {post.coverImageUrl && (
        <div
          className="reveal relative mt-10 aspect-[16/9] overflow-hidden rounded-xl bg-bg-raised lg:-mx-16"
          style={{ "--reveal-delay": "60ms" } as React.CSSProperties}
        >
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

      {videoId && (
        <div className="reveal mt-10 lg:-mx-16" style={{ "--reveal-delay": "60ms" } as React.CSSProperties}>
          <YouTubeEmbed id={videoId} title={post.title} />
        </div>
      )}

      <div className="reveal prose mt-10 max-w-none" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
        {body}
      </div>

      <OlderNewer older={older} newer={newer} />

      {/*
        TODO(Phase 5 — Comments): comments and replies go here. Signed-in
        readers can post; everyone can read. Keep the #comments id so links
        like /writing/slug#comments keep working.
      */}
      <section id="comments" aria-labelledby="comments-heading" className="mt-16 border-t border-rule pt-8">
        <h2 id="comments-heading" className="font-serif text-2xl font-semibold">
          Comments
        </h2>
        <p className="mt-3 text-fg-muted">
          Comments aren&apos;t open yet. Soon you&apos;ll be able to sign in and reply here.
        </p>
      </section>
    </article>
  );
}

/** The articles published just before and after this one (from the cached list). */
async function neighbours(slug: string): Promise<{ older?: PostSummary; newer?: PostSummary }> {
  const posts = await getPublishedPosts(); // newest first
  const index = posts.findIndex((post) => post.slug === slug);
  if (index === -1) return {};
  return { newer: posts[index - 1], older: posts[index + 1] };
}

function OlderNewer({ older, newer }: { older?: PostSummary; newer?: PostSummary }) {
  if (!older && !newer) return null;
  return (
    <nav aria-label="More writing" className="mt-16 grid gap-6 border-t border-rule pt-8 sm:grid-cols-2">
      {older && (
        <Link href={`/writing/${older.slug}`} className="group no-underline">
          <span className="text-sm text-fg-muted">← Older</span>
          <span className="mt-1 block font-serif text-xl leading-snug text-fg group-hover:text-accent">
            {older.title}
          </span>
        </Link>
      )}
      {newer && (
        <Link href={`/writing/${newer.slug}`} className="group no-underline sm:col-start-2 sm:text-right">
          <span className="text-sm text-fg-muted">Newer →</span>
          <span className="mt-1 block font-serif text-xl leading-snug text-fg group-hover:text-accent">
            {newer.title}
          </span>
        </Link>
      )}
    </nav>
  );
}
