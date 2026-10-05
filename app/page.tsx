import type { Metadata } from "next";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { Badge, BadgeRow } from "@/components/badge";
import { BookCard } from "@/components/book-card";
import { Card } from "@/components/card";
import { spanClass } from "@/components/card-grid";
import { GameCard } from "@/components/game-card";
import { HobbyCard } from "@/components/hobby-card";
import { ProjectCard } from "@/components/project-card";
import { SongCard } from "@/components/song-card";
import { NowProducingCard } from "@/components/status-cards";
import { PostDate, WritingCard } from "@/components/writing-card";
import { getPublishedBooks } from "@/lib/books";
import { getPublishedGames } from "@/lib/games-loader";
import { fillGrid, type Span } from "@/lib/grid";
import { getPublishedHobbies } from "@/lib/hobbies-loader";
import { homeLayout, type HomeEntry } from "@/lib/home";
import { countTags, getPublishedPosts, type PostSummary, type TagCount } from "@/lib/posts";
import { getPublishedProjects } from "@/lib/projects";
import { openGraphDefaults, site } from "@/lib/site";
import { getNowProducing, getPublishedSongs } from "@/lib/tracks";

// Home: a chester.how-style "digital garden". The intro sits in the top-left
// of one dense grid that mixes every section: the latest article, the status
// cards (now producing, reading, learning), then the next articles and every
// item marked "Show on home", newest first; the YouTube and archive cards
// close it. Each card is the same card as on its section page.

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...openGraphDefaults, url: "/" },
};

/** A card waiting for its place: its width, and how to draw it there. */
type Slot = { key: string; span: Span; render: (span: Span, index: number) => ReactNode };

const sizeSpan = (size: "small" | "wide"): Span => (size === "wide" ? 2 : 1);

export default async function Home() {
  const [posts, projects, books, songs, games, hobbies, producing] = await Promise.all([
    getPublishedPosts(),
    getPublishedProjects(),
    getPublishedBooks(),
    getPublishedSongs(),
    getPublishedGames(),
    getPublishedHobbies(),
    getNowProducing(),
  ]);
  const { featured, reading, learning, feed } = homeLayout({ posts, projects, books, songs, games, hobbies });

  const slots: Slot[] = [
    ...(featured ? [{ key: "featured", span: 2 as Span, render: (_: Span, i: number) => <FeaturedWritingCard post={featured} index={i} /> }] : []),
    ...(producing ? [{ key: "producing", span: 1 as Span, render: (s: Span, i: number) => <NowProducingCard song={producing} index={i} className={spanClass(s)} /> }] : []),
    ...reading.map((book) => ({ key: `book-${book.id}`, span: sizeSpan(book.cardSize), render: (s: Span, i: number) => <BookCard book={book} span={s} index={i} /> })),
    ...learning.map((hobby) => ({ key: `hobby-${hobby.id}`, span: sizeSpan(hobby.cardSize), render: (s: Span, i: number) => <HobbyCard hobby={hobby} span={s} index={i} /> })),
    ...feed.map((entry) => ({ key: entry.key, span: entrySpan(entry), render: (s: Span, i: number) => <EntryCard entry={entry} span={s} index={i} /> })),
    { key: "youtube", span: 1, render: (s, i) => <YouTubeCard index={i} className={spanClass(s)} /> },
    { key: "archive", span: 2, render: (_, i) => <ArchiveCard postCount={posts.length} tags={countTags(posts)} index={i} /> },
  ];
  const { spans, fillers } = fillGrid(
    slots.map((slot) => slot.span),
    { intro: true },
  );

  return (
    // Phones and tablets: the intro is a row of its own (as tall as its text),
    // then square cells. Desktop: the intro takes the top-left 2 × 2 cells.
    <div className="grid grid-flow-dense auto-rows-(--cell-2) grid-cols-2 grid-rows-[auto] gap-(--grid-gap) pt-2 pb-8 lg:auto-rows-(--cell) lg:grid-cols-4 lg:grid-rows-none">
      <Intro className="col-span-2 lg:row-span-2" />
      {slots.map((slot, i) => (
        <Fragment key={slot.key}>{slot.render(spans[i], i)}</Fragment>
      ))}
      {fillers.map((span, i) => (
        <MoreCard key={i} index={slots.length + i} className={spanClass(span)} />
      ))}
    </div>
  );
}

function entrySpan(entry: HomeEntry): Span {
  switch (entry.kind) {
    case "post":
      return 1;
    case "project":
      return sizeSpan(entry.project.cardSize);
    case "book":
      return sizeSpan(entry.book.cardSize);
    case "song":
      return sizeSpan(entry.song.cardSize);
    case "game":
      return sizeSpan(entry.game.cardSize);
    case "hobby":
      return sizeSpan(entry.hobby.cardSize);
  }
}

/** A dated card, drawn by its section's own card. */
function EntryCard({ entry, span, index }: { entry: HomeEntry; span: Span; index: number }) {
  switch (entry.kind) {
    case "post":
      return <WritingCard post={entry.post} index={index} className={spanClass(span)} square />;
    case "project":
      return <ProjectCard project={entry.project} span={span} index={index} />;
    case "book":
      return <BookCard book={entry.book} span={span} index={index} />;
    case "song":
      return <SongCard song={entry.song} span={span} index={index} label={`Music · ${entry.song.title}`} />;
    case "game":
      return <GameCard game={entry.game} span={span} index={index} />;
    case "hobby":
      return <HobbyCard hobby={entry.hobby} span={span} index={index} />;
  }
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

function FeaturedWritingCard({ post, index }: { post: PostSummary; index: number }) {
  return (
    <Card label="Writing · Latest" href={writingHref(post)} index={index} className="col-span-2">
      {/* Sized to the cell (measured): phones show the title and date only. */}
      <div className="hidden sm:block">
        <BadgeRow items={post.tags} />
      </div>
      <h2 className="line-clamp-2 shrink-0 font-serif text-xl leading-[1.1] sm:mt-3 sm:text-[2.5rem] lg:text-3xl xl:text-5xl">{post.title}</h2>
      <PostDate post={post} />
      <p className="mt-2 hidden max-w-prose text-sm text-fg-muted sm:line-clamp-2 lg:hidden xl:line-clamp-1 2xl:line-clamp-2">{post.summary}</p>
    </Card>
  );
}

// Links to the channel for now. The polish phase replaces this with live video cards.
function YouTubeCard({ index, className }: { index: number; className?: string }) {
  const handle = site.links.youtube.split("/").pop();
  return (
    <Card label={`YouTube · ${handle}`} href={site.links.youtube} index={index} className={className}>
      {/* Phone cells are short: the play button sits beside the words there. */}
      <div className="flex items-end gap-3 sm:block">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-bg shadow-[0_0_24px_var(--accent-glow)] sm:size-11">
          <svg viewBox="0 0 24 24" className="ml-0.5 size-4" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13l10.5-6.5z" />
          </svg>
        </span>
        <p className="shrink-0 font-serif text-base leading-tight sm:mt-3 sm:text-2xl xl:text-[1.75rem]">New videos on the channel</p>
      </div>
    </Card>
  );
}

function ArchiveCard({ postCount, tags, index }: { postCount: number; tags: TagCount[]; index: number }) {
  return (
    <Card label="Writing · Archive" href="/writing" index={index} className="col-span-2">
      <p className="shrink-0 font-serif text-5xl leading-none xl:text-6xl">
        {postCount}
        <span className="ml-2 font-sans text-sm text-fg-muted">{postCount === 1 ? "article" : "articles"}</span>
      </p>
      {/* As many tags as fit: up to two rows (one on phones); the rest drop out whole. */}
      <div className="mt-4 flex h-6 flex-wrap gap-1.5 overflow-hidden sm:h-[3.375rem]">
        {tags.map(({ tag, count }) => (
          // toneKey keeps each tag's color the same as its badge elsewhere.
          <Badge key={tag} toneKey={tag}>{`${tag} ${count}`}</Badge>
        ))}
      </div>
    </Card>
  );
}

/** Fills a short last row (after widening a card didn't do it): a quiet pointer to the writing. */
function MoreCard({ index, className }: { index: number; className?: string }) {
  return (
    <Card label="Writing · More" href="/writing" index={index} className={className}>
      <p className="font-serif text-2xl leading-tight text-fg-muted sm:text-3xl">More in writing</p>
    </Card>
  );
}
