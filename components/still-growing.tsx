import { SproutArt } from "@/components/sprout-art";

// What a section page shows while it has nothing published: a friendly note
// and the sprouting seed, on the raised card colour so the page doesn't look
// broken or bare. The home page has its own card version (StillGrowingCard in
// app/page.tsx).

const LINES = {
  writing: "The first articles are on their way.",
  projects: "New things are being built. Check back soon.",
  reading: "The shelf is still being stocked.",
  music: "New songs are in the works.",
  games: "The first reviews are on their way.",
  hobbies: "New hobbies are taking root.",
} as const;

export type GrowingSection = keyof typeof LINES;

export function StillGrowing({ section }: { section: GrowingSection }) {
  return (
    <div className="mb-8 flex items-center gap-5 rounded-xl bg-bg-raised p-6 sm:gap-8 sm:p-10">
      <SproutArt size={64} />
      <div className="min-w-0">
        <p className="font-serif text-3xl leading-tight sm:text-4xl">Still growing.</p>
        <p className="mt-2 text-fg-muted">{LINES[section]}</p>
      </div>
    </div>
  );
}
