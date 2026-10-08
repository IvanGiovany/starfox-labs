import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionHeader } from "@/components/section-header";
import { StillGrowing } from "@/components/still-growing";
import { WritingBrowser, WritingBrowserFallback } from "@/components/writing-browser";
import { countTags, getPublishedPosts } from "@/lib/posts";
import { openGraphDefaults } from "@/lib/site";
import { SECTION_META } from "@/lib/section-meta";

const { description } = SECTION_META.writing;

export const metadata: Metadata = {
  title: "Writing",
  description,
  alternates: { canonical: "/writing" },
  openGraph: { ...openGraphDefaults, url: "/writing", title: "Writing", description },
};

export default async function WritingPage() {
  const posts = await getPublishedPosts();
  const tags = countTags(posts);

  return (
    <>
      <SectionHeader title="writing">
        {/* TODO(Ivan): rewrite in your own words. */}
        Notes on the software I&apos;m building and learning, written as I go. Mostly Next.js,
        TypeScript and databases, with the occasional detour into music.
      </SectionHeader>

      {/*
        WritingBrowser reads the URL (?tag=, ?q=) with useSearchParams, which
        only exists in the browser. The Suspense boundary lets Next.js
        prerender everything else, and ship the fallback (the unfiltered first
        page of cards) as real HTML until the browser takes over.
      */}
      {posts.length === 0 ? (
        // Nothing to search or filter yet.
        <StillGrowing section="writing" />
      ) : (
        <Suspense fallback={<WritingBrowserFallback posts={posts} tags={tags} />}>
          <WritingBrowser posts={posts} tags={tags} />
        </Suspense>
      )}
    </>
  );
}
