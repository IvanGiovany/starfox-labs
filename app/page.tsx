import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Badges } from "@/components/badge";
import { Card } from "@/components/card";
import { CurrentlyLearningCard, NowProducingCard } from "@/components/status-cards";
import { PostDate, WritingCard } from "@/components/writing-card";
import { countTags, getPublishedPosts, type PostSummary, type TagCount } from "@/lib/posts";
import { openGraphDefaults, site } from "@/lib/site";

// Home: a chester.how-style "digital garden". The intro sits in the top-left
// of one dense card grid that mixes every section. For now the grid holds
// writing and status cards; projects, books, music and hobbies join in the
// Sections phase.

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...openGraphDefaults, url: "/" },
};

export default async function Home() {
  const posts = await getPublishedPosts();
  const [latest, ...rest] = posts;

  // Keep the grid free of holes. Counting cells on the 4-column layout:
  // intro 4 + featured 2 + producing 1 + learning 1 + YouTube 1 + archive 2 = 11,
  // so the small writing cards must number 1, 5, 9, ... to fill whole rows.
  // An odd count also keeps the 2-column mobile layout even.
  const smallCount = rest.length >= 5 ? 5 : Math.min(rest.length, 1);
  const small = rest.slice(0, smallCount);

  return (
    <div className="grid grid-flow-dense grid-cols-2 gap-(--grid-gap) pt-2 pb-8 sm:auto-rows-[minmax(11rem,auto)] lg:grid-cols-4 lg:auto-rows-(--cell)">
      <Intro className="col-span-2 lg:row-span-2" />
      {/* index: the order the cards drop in, 0.15 s apart. */}
      {latest && <FeaturedWritingCard post={latest} index={0} className="col-span-2" />}
      <NowProducingCard index={1} />
      {small[0] && <WritingCard post={small[0]} index={2} />}
      <CurrentlyLearningCard index={3} />
      {small.slice(1, 4).map((post, i) => (
        <WritingCard key={post.slug} post={post} index={4 + i} />
      ))}
      <YouTubeCard index={7} />
      {small[4] && <WritingCard post={small[4]} index={8} />}
      <ArchiveCard postCount={posts.length} tags={countTags(posts)} index={9} className="col-span-2" />
    </div>
  );
}

function Intro({ className }: { className?: string }) {
  // Muted prose with the key words in full ink, like chester.how.
  const key = "text-fg no-underline decoration-fg-muted/50 decoration-dotted underline-offset-4 hover:underline";

  return (
    <section
      className={`pt-2 pr-4 pb-8 font-serif text-[1.6rem] leading-[1.3] font-light text-fg-muted sm:text-[1.9rem] lg:pb-0 lg:text-[clamp(2rem,2.3vw,2.6rem)] ${className}`}
    >
      {/* TODO(Ivan): rewrite in your own words. */}
      <p>
        Hi, I&apos;m <span className="text-fg">Ivan</span>. Welcome to{" "}
        <span className="text-fg">Starfox Labs</span>, my small corner of the internet. I{" "}
        <Link href="/projects" className={key}>
          build things
        </Link>
        ,{" "}
        <Link href="/writing" className={key}>
          write
        </Link>{" "}
        about software, and make videos on{" "}
        <a href={site.links.youtube} target="_blank" rel="noreferrer" className={key}>
          YouTube
        </a>
        .
      </p>
      <p className="mt-5">
        Away from the keyboard I make{" "}
        <Link href="/music" className={key}>
          music
        </Link>{" "}
        as <span className="text-fg">Spektral</span>.
      </p>
      {/* Becomes a real subscribe link in the Newsletter phase. */}
      <p className="mt-5 font-sans text-sm font-normal">A newsletter for new writing is on its way.</p>
    </section>
  );
}

const writingHref = (post: PostSummary) => `/writing/${post.slug}`;

function FeaturedWritingCard({ post, index, className }: { post: PostSummary; index: number; className?: string }) {
  return (
    <Card label="Writing · Latest" href={writingHref(post)} index={index} className={className}>
      <Badges items={post.tags} />
      <h2 className="mt-3 line-clamp-2 font-serif text-3xl leading-[1.1] sm:text-[2.5rem] xl:text-5xl">{post.title}</h2>
      <PostDate post={post} />
      <p className="mt-2 line-clamp-2 max-w-prose text-sm text-fg-muted sm:text-base">{post.summary}</p>
    </Card>
  );
}

// Links to the channel for now. The polish phase replaces this with live video cards.
function YouTubeCard({ index }: { index: number }) {
  const handle = site.links.youtube.split("/").pop();
  return (
    <Card label={`YouTube · ${handle}`} href={site.links.youtube} index={index}>
      <span className="flex size-11 items-center justify-center rounded-full bg-accent text-bg shadow-[0_0_24px_var(--accent-glow)]">
        <svg viewBox="0 0 24 24" className="ml-0.5 size-4" fill="currentColor" aria-hidden="true">
          <path d="M8 5.5v13l10.5-6.5z" />
        </svg>
      </span>
      <p className="mt-3 font-serif text-xl leading-tight sm:text-2xl xl:text-[1.75rem]">New videos on the channel</p>
    </Card>
  );
}

function ArchiveCard({ postCount, tags, index, className }: { postCount: number; tags: TagCount[]; index: number; className?: string }) {
  return (
    <Card label="Writing · Archive" href="/writing" index={index} className={className}>
      <p className="font-serif text-5xl leading-none xl:text-6xl">
        {postCount}
        <span className="ml-2 font-sans text-sm text-fg-muted">{postCount === 1 ? "article" : "articles"}</span>
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {tags.map(({ tag, count }) => (
          // toneKey keeps each tag's color the same as its badge elsewhere.
          <Badge key={tag} toneKey={tag}>{`${tag} ${count}`}</Badge>
        ))}
      </div>
    </Card>
  );
}
