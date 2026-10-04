import Image from "next/image";
import { Badges } from "@/components/badge";
import { Card } from "@/components/card";
import { spanClass } from "@/components/card-grid";
import { TypedCover } from "@/components/cover";
import { formatMonth } from "@/lib/format";
import type { Span } from "@/lib/grid";
import { site } from "@/lib/site";
import type { Song } from "@/lib/tracks";

// A song card, in the style of the book cards: the cover art as a square
// record sleeve at the bottom left, and beside it the title and release
// month. On hover or focus a record slides up out of the sleeve and spins.
export function SongCard({ song, span, index }: { song: Song; span: Span; index: number }) {
  const wide = span === 2;
  return (
    <Card label="Music · Songs" href={song.href} index={index} className={spanClass(span)}>
      <div className="flex items-end gap-3 sm:gap-4">
        <div className={`shrink-0 ${wide ? "w-[21%]" : "w-[45%]"}`}>
          <RecordSleeve title={song.title} coverUrl={song.coverUrl} coverAlt={song.coverAlt} sizes="(min-width: 1024px) 11vw, 22vw" record />
        </div>
        <div className="min-w-0 flex-1">
          {/* Extra badges only where there's room for them. */}
          <Badges items={song.badges} className="mb-2 hidden sm:flex" />
          <h2 className="line-clamp-2 text-xs leading-snug sm:line-clamp-3 sm:text-base lg:text-sm xl:text-base">{song.title}</h2>
          {song.releasedOn && (
            <p className="truncate text-xs leading-snug text-fg-muted sm:text-base lg:text-sm xl:text-base">{formatMonth(song.releasedOn)}</p>
          )}
          {/* Rows are short on phones (no note) and on small laptops (one line of note). */}
          {wide && song.note && (
            <p className="mt-2 hidden text-sm text-fg-muted sm:line-clamp-3 lg:line-clamp-1 xl:line-clamp-3">{song.note}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * A song's cover art as a square sleeve with a soft shadow (a typed cover
 * without art). With `record`, a record sits hidden behind it; hovering or
 * focusing the card around it slides the record up out of the sleeve
 * (300 ms) and spins it at 33⅓ rpm. Leaving stops it where it is (the spin
 * pauses rather than resetting) and slides it back. With reduced motion
 * nothing moves; the sleeve's shadow still deepens.
 */
export function RecordSleeve({
  title,
  coverUrl,
  coverAlt,
  sizes,
  record = false,
}: {
  title: string;
  coverUrl: string | null;
  coverAlt: string;
  sizes: string;
  record?: boolean;
}) {
  return (
    <div className="relative">
      {record && (
        <div
          aria-hidden="true"
          className="absolute inset-[4%] transition-[translate] duration-300 ease-out motion-safe:group-focus-within:-translate-y-[40%] motion-safe:group-hover:-translate-y-[40%]"
        >
          {/* Paused in the shorthand itself; hovering (a more specific rule) sets it running. */}
          <div className="vinyl relative size-full rounded-full group-focus-within:[animation-play-state:running] group-hover:[animation-play-state:running] motion-safe:animate-[record-spin_1.8s_linear_infinite_paused]">
            {/* The centre label: the cover art, or the typed cover (its tiny title shows the turning). */}
            <div className="absolute inset-[32%] overflow-hidden rounded-full">
              {coverUrl ? (
                <Image src={coverUrl} alt="" fill sizes={sizes} className="object-cover" />
              ) : (
                <TypedCover title={title} byline={null} shape="square" />
              )}
            </div>
            <span className="absolute top-1/2 left-1/2 size-[5%] -translate-1/2 rounded-full bg-bg-raised" />
          </div>
          <div className="vinyl-sheen pointer-events-none absolute inset-0 rounded-full" />
        </div>
      )}
      <div
        className={`relative overflow-hidden rounded-[3px] shadow-[0_6px_16px_-6px_rgb(0_0_0/0.35)] transition-shadow duration-150 ease-out ${record ? "group-focus-within:shadow-[0_16px_32px_-8px_rgb(0_0_0/0.45)] group-hover:shadow-[0_16px_32px_-8px_rgb(0_0_0/0.45)]" : ""}`}
      >
        {coverUrl ? (
          <div className="relative aspect-square">
            <Image src={coverUrl} alt={coverAlt} fill sizes={sizes} className="object-cover" />
          </div>
        ) : (
          <TypedCover title={title} byline={site.artist} shape="square" />
        )}
      </div>
    </div>
  );
}
