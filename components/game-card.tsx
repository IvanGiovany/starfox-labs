import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { spanClass } from "@/components/card-grid";
import { FramedScreenshot } from "@/components/framed-screenshot";
import type { Game } from "@/lib/games-loader";
import { gameDetails, PLAY_STATUS_LABELS } from "@/lib/games";
import type { Span } from "@/lib/grid";

// A game card: label, status badge (+ Ivan's badges) and a muted details line
// ("PC · 62.5 h · 9/10") under it, then Ivan's screenshot in a window frame
// that pops up out of the card on hover (see FramedScreenshot). Without a
// screenshot it's a text card. Every card opens Ivan's review.
export function GameCard({ game, span, index }: { game: Game; span: Span; index: number }) {
  return (
    <Card
      label={`Games · ${game.title}`}
      href={game.href}
      index={index}
      meta={
        game.imageUrl ? (
          <div className="flex flex-col gap-1">
            <GameBadges game={game} />
            <DetailsLine game={game} />
          </div>
        ) : undefined
      }
      className={spanClass(span)}
    >
      {game.imageUrl ? (
        // Low enough to clear the lines above, even while it pops up.
        <FramedScreenshot src={game.imageUrl} alt={game.imageAlt} wide={span === 2} hover="pop" className="top-[max(30%,6.625rem)] sm:top-[max(30%,7.75rem)]" />
      ) : (
        <>
          <GameBadges game={game} />
          <h2 className="mt-2 line-clamp-2 font-serif text-3xl leading-[1.05] sm:text-4xl">{game.title}</h2>
          <DetailsLine game={game} className="mt-2" />
        </>
      )}
    </Card>
  );
}

/** The status badge, then Ivan's badges from `sm` up, on one row: badges that don't fit drop out whole. */
function GameBadges({ game }: { game: Game }) {
  return (
    <div className="flex h-6 flex-wrap gap-1.5 overflow-hidden">
      <Badge>{PLAY_STATUS_LABELS[game.playStatus]}</Badge>
      {game.badges.map((badge) => (
        <span key={badge} className="hidden sm:flex">
          <Badge>{badge}</Badge>
        </span>
      ))}
    </div>
  );
}

/** "PC · 62.5 h · 9/10"; phone cards are narrow, so there only hours and rating. */
function DetailsLine({ game, className = "" }: { game: Game; className?: string }) {
  const full = gameDetails(game);
  if (!full) return null;
  return (
    <p className={`truncate text-xs text-fg-muted ${className}`}>
      <span className="sm:hidden">{gameDetails(game, true)}</span>
      <span className="hidden sm:inline">{full}</span>
    </p>
  );
}
