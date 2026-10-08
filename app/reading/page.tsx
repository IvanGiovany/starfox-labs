import type { Metadata } from "next";
import { Fragment } from "react";
import { BookCard } from "@/components/book-card";
import { Card } from "@/components/card";
import { CardGrid, spanClass } from "@/components/card-grid";
import { SectionHeader } from "@/components/section-header";
import { StillGrowing } from "@/components/still-growing";
import { getPublishedBooks, shelfCounts, type Book } from "@/lib/books";
import { fillGrid, type Span } from "@/lib/grid";
import { openGraphDefaults } from "@/lib/site";

const description = "What I'm reading, what I've finished, and what's next.";

export const metadata: Metadata = {
  title: "Reading",
  description,
  alternates: { canonical: "/reading" },
  openGraph: { ...openGraphDefaults, url: "/reading", title: "Reading", description },
};

// Reading, chester-style: square book cards, the cover standing at the bottom
// left. Currently reading first, then read (newest finished first), then to read.
export default async function ReadingPage() {
  const books = await getPublishedBooks();
  const { spans, fillers } = fillGrid(books.map((b) => (b.cardSize === "wide" ? 2 : 1)));

  return (
    <>
      <SectionHeader title="reading">
        {/* TODO(Ivan): rewrite in your own words. */}
        The books I&apos;m reading now, the ones I&apos;ve finished, and the pile waiting by the bed. When I
        write about a book, its card takes you there.
      </SectionHeader>

      {books.length === 0 ? (
        <StillGrowing section="reading" />
      ) : (
        <CardGrid>
          {books.map((book, i) => (
            <BookCard key={book.id} book={book} span={spans[i]} index={i} />
          ))}
          {fillers.map((span, i) =>
            i === 0 ? (
              <ShelfCard key={i} books={books} span={span} index={books.length} />
            ) : (
              <MoreCard key={i} span={span} index={books.length + i} />
            ),
          )}
        </CardGrid>
      )}
    </>
  );
}

/** Fills a short last row: how many books are read, being read and waiting. */
function ShelfCard({ books, span, index }: { books: Book[]; span: Span; index: number }) {
  const counts = shelfCounts(books);
  const parts = (
    [
      [counts.read, "read"],
      [counts.reading, "reading"],
      [counts.to_read, "to read"],
    ] as const
  ).filter(([count]) => count > 0);

  return (
    <Card label="Reading · Shelf" index={index} className={spanClass(span)}>
      <p className="font-serif text-2xl leading-tight text-fg-muted sm:text-3xl">
        {parts.map(([count, words], i) => (
          <Fragment key={words}>
            {i > 0 && (i === parts.length - 1 ? " and " : ", ")}
            <span className="text-fg">{count}</span> {words}
          </Fragment>
        ))}
        .
      </p>
    </Card>
  );
}

/** A second filler, rarely needed: a pointer to the writing. */
function MoreCard({ span, index }: { span: Span; index: number }) {
  return (
    <Card label="Reading · More" href="/writing" index={index} className={spanClass(span)}>
      <p className="font-serif text-2xl leading-tight text-fg-muted sm:text-3xl">More in writing</p>
    </Card>
  );
}
