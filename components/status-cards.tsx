import { site } from "@/lib/site";
import type { NowProducing } from "@/lib/tracks";
import { BadgeRow } from "./badge";
import { Card } from "./card";

// The home grid's "Now producing" card, like chester.how's "Now brewing": the
// song Ivan is working on (a track marked in progress in the admin). The other
// status cards are ordinary section cards: books being read (BookCard) and
// Learning items (HobbyCard).

// Bar heights and timings are fixed (not random) so server and browser agree.
const BARS = [0.9, 0.55, 1, 0.7, 0.85, 0.45, 0.95, 0.6, 0.8, 0.5, 0.75, 1, 0.65, 0.85];

export function NowProducingCard({ song, index, className }: { song: NowProducing; index?: number; className?: string }) {
  return (
    <Card label={`Music · ${site.artist}`} href={song.href ?? undefined} index={index} className={className}>
      {/* Phone cells only have room for the badge and title. */}
      <div aria-hidden="true" className="mb-4 hidden h-7 shrink-0 items-end gap-[3px] sm:flex">
        {BARS.map((height, i) => (
          <span
            key={i}
            className="w-full origin-bottom rounded-[1.5px] bg-accent/60"
            style={{
              height: `${height * 100}%`,
              animation: `eq ${1.1 + (i % 4) * 0.25}s ease-in-out ${i * -0.13}s infinite`,
            }}
          />
        ))}
      </div>
      <BadgeRow items={["Now producing"]} />
      <p className="mt-2 line-clamp-2 shrink-0 font-serif text-xl leading-[1.05] sm:text-3xl lg:text-2xl xl:text-3xl">{song.title}</p>
      {/* No room on phones or small laptops. */}
      {song.note && <p className="mt-2 hidden text-sm text-fg-muted sm:line-clamp-2 lg:hidden xl:line-clamp-2">{song.note}</p>}
    </Card>
  );
}
