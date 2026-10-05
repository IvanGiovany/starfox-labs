import Image from "next/image";
import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { spanClass } from "@/components/card-grid";
import { TypedCover } from "@/components/cover";
import type { Book } from "@/lib/books";
import type { Span } from "@/lib/grid";
import { READING_STATUS_LABELS } from "@/lib/reading";

// A book card, chester-style: the cover stands at the bottom left like a book
// on a shelf, and beside it, lined up with its bottom, the status badge, the
// title and the author. Wide cards have room for the rating and Ivan's note.
// On hover or focus the cover tilts, grows and casts a deeper shadow.
export function BookCard({ book, span, index }: { book: Book; span: Span; index: number }) {
  const wide = span === 2;
  return (
    <Card
      label="Reading · Books"
      href={book.href ?? undefined}
      links={book.links}
      linkLabel={book.title}
      index={index}
      className={spanClass(span)}
    >
      <div className="flex items-end gap-3 sm:gap-4">
        <div className={`shrink-0 ${wide ? "w-[16%] sm:w-[19%]" : "w-[40%]"}`}>
          <BookCover
            title={book.title}
            author={book.author}
            coverUrl={book.coverUrl}
            coverAlt={book.coverAlt}
            sizes="(min-width: 1024px) 10vw, 20vw"
            tilt
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1">
            <Badge>{READING_STATUS_LABELS[book.readingStatus]}</Badge>
            {/* Extra badges only where there's room for them. */}
            <span className="hidden sm:contents">
              {book.badges.map((badge) => (
                <Badge key={badge}>{badge}</Badge>
              ))}
            </span>
          </div>
          {/* Phones' cells are small: two lines of title there, three elsewhere. */}
          <h2 className="mt-1 line-clamp-2 text-xs leading-snug sm:mt-2 sm:line-clamp-3 sm:text-base lg:text-sm xl:text-base">{book.title}</h2>
          {book.author && (
            <p className="line-clamp-1 text-xs leading-snug text-fg-muted sm:line-clamp-2 sm:text-base lg:text-sm xl:text-base">
              {book.author}
            </p>
          )}
          {wide && book.rating != null && (
            <p className="mt-1 hidden text-sm sm:block">
              <Stars rating={book.rating} />
            </p>
          )}
          {/* Rows are short on phones (no room for rating or note) and on small laptops (one line of note). */}
          {wide && book.note && (
            <p className="mt-2 hidden text-sm text-fg-muted sm:line-clamp-3 lg:line-clamp-1 xl:line-clamp-3">{book.note}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * A book's cover standing upright with a soft shadow. It keeps its own shape;
 * a book without a cover gets a plain typed one (its title and author on a
 * soft colour picked from the title). With `tilt`, hovering or focusing the
 * card around it tilts it −3°, grows it to 110% and deepens the shadow
 * (chester's book covers, 150 ms; no movement with reduced motion).
 */
export function BookCover({
  title,
  author,
  coverUrl,
  coverAlt,
  sizes,
  tilt = false,
}: {
  title: string;
  author: string | null;
  coverUrl: string | null;
  coverAlt: string;
  sizes: string;
  tilt?: boolean;
}) {
  const hover = tilt
    ? "group-hover:shadow-[0_16px_32px_-8px_rgb(0_0_0/0.45)] group-focus-within:shadow-[0_16px_32px_-8px_rgb(0_0_0/0.45)] motion-safe:group-hover:rotate-[-3deg] motion-safe:group-hover:scale-110 motion-safe:group-focus-within:rotate-[-3deg] motion-safe:group-focus-within:scale-110"
    : "";
  return (
    // The column it stands in. A cover is never taller than a 2:3 cover of the
    // column's width (150cqw): taller ones (e.g. 1:1.8) keep their shape and get
    // narrower instead of pushing the card's text out of the bottom.
    <div className="@container">
      <div className={`w-fit max-w-full overflow-hidden rounded-[3px] shadow-[0_6px_16px_-6px_rgb(0_0_0/0.35)] transition duration-150 ease-out ${hover}`}>
        {coverUrl ? (
          // Nominal 2:3 size until the real cover loads; then it keeps its own shape.
          <Image src={coverUrl} alt={coverAlt} width={600} height={900} sizes={sizes} className="block h-auto max-h-[150cqw] w-auto max-w-full" />
        ) : (
          <TypedCover title={title} byline={author} shape="book" />
        )}
      </div>
    </div>
  );
}

/** A rating as stars, e.g. ★★★★☆ for 4 out of 5. */
export function Stars({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span role="img" aria-label={`Rated ${rating} out of ${max}`} className="tracking-wider">
      {"★".repeat(rating)}
      <span className="opacity-30">{"★".repeat(Math.max(0, max - rating))}</span>
    </span>
  );
}
