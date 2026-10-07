import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AboutItem } from "@/components/about-item";
import { ArticleView } from "@/components/article-view";
import { ARTICLE_END_ID, SignUpPrompt } from "@/components/sign-up-prompt";
import { SIGN_UP_PROMPT } from "@/lib/features";
import { readingTime } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { getPostItem } from "@/lib/post-items";
import { articleStaticParams, getPostBySlug, getPublishedPosts, type PostSummary } from "@/lib/posts";
import { openGraphDefaults, site } from "@/lib/site";

// One article: a simple reading column, text-first (no cards), styled after
// chester.how's blog: big serif title, a quiet italic date line, a short rule.
// The article itself is drawn by ArticleView, which the editor's live preview
// shares.

// Every published article is prerendered at build time; articles published
// later are rendered on their first visit and then cached.
export const generateStaticParams = articleStaticParams;

// For a slug that wasn't prerendered, this page deliberately waits for the
// article before sending anything, so a missing one gets a real 404 status.
// (Reading params inside <Suspense>, Next's "instant" pattern, would stream the
// page first, and a 404 decided after that can only be a 200 with noindex.)
// `instant = false` tells Next's development check that this wait is intended.
// It doesn't change rendering: known articles stay fully prerendered.
export const instant = false;

// Title, description and link-preview tags. The preview image itself comes
// from opengraph-image.tsx in this folder; Next.js adds its tags automatically.
export async function generateMetadata({ params }: PageProps<"/writing/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Page not found" };

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

  const [body, { older, newer }, item] = await Promise.all([renderMarkdown(post.bodyMd), neighbours(slug), getPostItem(post.id)]);

  return (
    <article className="mx-auto max-w-[42rem] pt-6 pb-8 sm:pt-10">
      <Link href="/writing" className="text-sm text-fg-muted no-underline hover:text-fg">
        ← writing.
      </Link>

      <ArticleView
        title={post.title}
        publishedAt={post.publishedAt}
        minutes={readingTime(post.bodyMd)}
        tags={post.tags}
        coverImageUrl={post.coverImageUrl}
        youtubeUrl={post.youtubeUrl}
        about={item && <AboutItem item={item} />}
        body={body}
      />
      {/* Where "finished reading" is measured (the sign-up prompt watches it). */}
      {SIGN_UP_PROMPT && <div id={ARTICLE_END_ID} aria-hidden="true" />}

      <OlderNewer older={older} newer={newer} />

      {SIGN_UP_PROMPT && <SignUpPrompt slug={post.slug} />}

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
