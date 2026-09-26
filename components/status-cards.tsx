import { site } from "@/lib/site";
import { Badges } from "./badge";
import { Card } from "./card";

// Personal status cards for the home grid, like chester.how's "Now brewing".
// Content lives in lib/site.ts for now (moves to the database in the Sections phase).

// Bar heights and timings are fixed (not random) so server and browser agree.
const BARS = [0.9, 0.55, 1, 0.7, 0.85, 0.45, 0.95, 0.6, 0.8, 0.5, 0.75, 1, 0.65, 0.85];

export function NowProducingCard({ className }: { className?: string }) {
  const { artist, title, note, href } = site.now.producing;

  return (
    <Card label={`Music · ${artist}`} href={href || undefined} className={className}>
      <div aria-hidden="true" className="mb-4 flex h-7 items-end gap-[3px]">
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
      <Badges items={["Now producing"]} />
      <p className="mt-2 line-clamp-2 font-serif text-[1.75rem] leading-[1.05] sm:text-3xl">{title}</p>
      <p className="mt-2 line-clamp-2 text-sm text-fg-muted">{note}</p>
    </Card>
  );
}

export function CurrentlyLearningCard({ className }: { className?: string }) {
  const { topic, items } = site.now.learning;

  return (
    <Card label="Hobbies · Learning" className={className}>
      <Badges items={["Learning"]} />
      <p className="mt-2 line-clamp-2 font-serif text-[1.75rem] leading-[1.05] sm:text-3xl">{topic}</p>
      <p className="mt-2 line-clamp-3 text-sm text-fg-muted">{items.join(" · ")}</p>
    </Card>
  );
}
