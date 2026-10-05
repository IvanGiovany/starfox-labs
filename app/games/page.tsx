import type { Metadata } from "next";
import { Card } from "@/components/card";
import { CardGrid, spanClass } from "@/components/card-grid";
import { GameCard } from "@/components/game-card";
import { SectionHeader } from "@/components/section-header";
import { hoursSummary } from "@/lib/games";
import { getPublishedGames, type Game } from "@/lib/games-loader";
import { fillGrid, type Span } from "@/lib/grid";
import { openGraphDefaults } from "@/lib/site";

const description = "Games I'm playing and have played, each with a review.";

export const metadata: Metadata = {
  title: "Games",
  description,
  alternates: { canonical: "/games" },
  openGraph: { ...openGraphDefaults, url: "/games", title: "Games", description },
};

// Games: my own screenshots in window frames, like the project cards, that
// pop up out of the card on hover. Every card opens my review of the game.
export default async function GamesPage() {
  const games = await getPublishedGames();
  const { spans, fillers } = fillGrid(games.map((g) => (g.cardSize === "wide" ? 2 : 1)));

  return (
    <>
      <SectionHeader title="games">
        {/* TODO(Ivan): rewrite in your own words. */}
        What I&apos;m playing, what I&apos;ve finished and what I gave up on, all in my own screenshots. Every
        card opens my review of the game.
      </SectionHeader>

      {games.length === 0 ? (
        <p className="pb-8 text-fg-muted">Nothing here yet.</p>
      ) : (
        <CardGrid>
          {games.map((game, i) => (
            <GameCard key={game.id} game={game} span={spans[i]} index={i} />
          ))}
          {fillers.map((span, i) =>
            i === 0 ? (
              <HoursCard key={i} games={games} span={span} index={games.length} />
            ) : (
              <MoreCard key={i} span={span} index={games.length + i} />
            ),
          )}
        </CardGrid>
      )}
    </>
  );
}

/** Fills a short last row: hours played across the games shown, and how many are finished. */
function HoursCard({ games, span, index }: { games: Game[]; span: Span; index: number }) {
  return (
    <Card label="Games · Hours" index={index} className={spanClass(span)}>
      <p className="font-serif text-2xl leading-tight text-fg-muted sm:text-3xl">
        {hoursSummary(games).map((part, i) =>
          part.strong ? (
            <span key={i} className="text-fg">
              {part.text}
            </span>
          ) : (
            part.text
          ),
        )}
      </p>
    </Card>
  );
}

/** A second filler, rarely needed: a pointer to the writing. */
function MoreCard({ span, index }: { span: Span; index: number }) {
  return (
    <Card label="Games · More" href="/writing" index={index} className={spanClass(span)}>
      <p className="font-serif text-2xl leading-tight text-fg-muted sm:text-3xl">More in writing</p>
    </Card>
  );
}
