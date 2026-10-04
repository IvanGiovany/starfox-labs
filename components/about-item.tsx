import Image from "next/image";
import { AudioPlayer } from "@/components/audio-player";
import { Badge } from "@/components/badge";
import { BookCover, Stars } from "@/components/book-card";
import { RecordSleeve } from "@/components/song-card";
import { formatMonth } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { detailList, detailText, type PostItem } from "@/lib/post-items";
import { READING_STATUS_LABELS, READING_STATUSES, type ReadingStatus } from "@/lib/reading";
import { site } from "@/lib/site";
import { TRACK_LINK_LABELS } from "@/lib/tracks";

// The "about this" panel near the top of an article that an item links to: a
// quiet raised box with the item's picture and its key facts. Each section
// gets its own version as its public page is built (Phase 3); sections
// without one show nothing yet.
export function AboutItem({ item }: { item: PostItem }) {
  switch (item.section) {
    case "projects":
      return <AboutProject item={item} />;
    case "books":
      return <AboutBook item={item} />;
    case "tracks":
      return <AboutSong item={item} />;
    default:
      return null;
  }
}

function AboutProject({ item }: { item: PostItem }) {
  const url = detailText(item.details, "url");
  const repo = detailText(item.details, "repo_url");
  const stack = detailList(item.details, "stack");
  const links = [...(url ? [{ label: "Visit the project", href: url }] : []), ...(repo ? [{ label: "Source code", href: repo }] : [])];

  return (
    <aside aria-label="About this project" className="flex flex-col gap-4 rounded-xl bg-bg-raised p-4 sm:flex-row sm:items-center sm:p-5">
      {item.imageUrl && (
        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-md border border-rule bg-bg sm:w-48">
          <Image src={item.imageUrl} alt={item.imageAlt} fill sizes="(min-width: 640px) 192px, 90vw" className="object-cover object-top" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-fg-muted">About this project</p>
        <p className="mt-1 font-serif text-2xl leading-tight">{item.title}</p>
        {stack.length > 0 && <p className="mt-1 text-sm text-fg-muted">{stack.join(" · ")}</p>}
        {links.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-x-4 text-sm">
            {links.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                {link.label} ↗
              </a>
            ))}
          </p>
        )}
      </div>
    </aside>
  );
}

/** A number field from an item's details, or null. */
const detailNumber = (details: Record<string, unknown>, key: string): number | null =>
  typeof details[key] === "number" ? (details[key] as number) : null;

function AboutBook({ item }: { item: PostItem }) {
  const author = detailText(item.details, "author");
  const status = detailText(item.details, "reading_status");
  const rating = detailNumber(item.details, "rating");
  const year = detailNumber(item.details, "published_year");
  const pages = detailNumber(item.details, "page_count");
  const facts = [year && String(year), pages && `${pages} pages`].filter(Boolean).join(" · ");

  return (
    <aside aria-label="About this book" className="flex items-end gap-4 rounded-xl bg-bg-raised p-4 sm:gap-5 sm:p-5">
      <div className="w-20 shrink-0 sm:w-24">
        <BookCover title={item.title} author={author} coverUrl={item.imageUrl} coverAlt={item.imageAlt} sizes="96px" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-fg-muted">About this book</p>
        <p className="mt-1 font-serif text-2xl leading-tight">{item.title}</p>
        {author && <p className="mt-0.5 text-sm text-fg-muted">{author}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {status && (READING_STATUSES as readonly string[]).includes(status) && (
            <Badge>{READING_STATUS_LABELS[status as ReadingStatus]}</Badge>
          )}
          {rating != null && <Stars rating={rating} />}
          {facts && <span className="text-fg-muted">{facts}</span>}
        </div>
      </div>
    </aside>
  );
}

/** The song's links (Spotify, SoundCloud…) in a fixed order, only the ones that are set. */
function songLinks(details: Record<string, unknown>): { label: string; href: string }[] {
  const links = details.links && typeof details.links === "object" && !Array.isArray(details.links) ? (details.links as Record<string, unknown>) : {};
  return Object.entries(TRACK_LINK_LABELS).flatMap(([key, label]) =>
    typeof links[key] === "string" && links[key] ? [{ label, href: links[key] as string }] : [],
  );
}

// Every song article shows this near the top: the sleeve, the snippet in the
// site's own player, and where to hear the whole song.
function AboutSong({ item }: { item: PostItem }) {
  const snippet = detailText(item.details, "snippet_path");
  const released = detailText(item.details, "released_on");
  const fullTrack = detailText(item.details, "full_track_url");
  const links = [...(fullTrack ? [{ label: "Listen to the full track", href: fullTrack }] : []), ...songLinks(item.details)];

  return (
    <aside aria-label="About this song" className="rounded-xl bg-bg-raised p-4 sm:p-5">
      <div className="flex items-end gap-4 sm:gap-5">
        <div className="w-20 shrink-0 sm:w-24">
          <RecordSleeve title={item.title} coverUrl={item.imageUrl} coverAlt={item.imageAlt} sizes="96px" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-fg-muted">About this song</p>
          <p className="mt-1 font-serif text-2xl leading-tight">{item.title}</p>
          <p className="mt-0.5 text-sm text-fg-muted">{[site.artist, released && formatMonth(released)].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      {snippet && (
        <div className="mt-4">
          <AudioPlayer src={mediaUrl(snippet)} title={item.title} savedSeconds={detailNumber(item.details, "snippet_seconds")} />
        </div>
      )}
      {links.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {links.map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
              {link.label} ↗
            </a>
          ))}
        </p>
      )}
    </aside>
  );
}
