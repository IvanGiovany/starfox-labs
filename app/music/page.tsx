import type { Metadata } from "next";
import { Card } from "@/components/card";
import { CardGrid, spanClass } from "@/components/card-grid";
import { SectionHeader } from "@/components/section-header";
import { StillGrowing } from "@/components/still-growing";
import { SongCard } from "@/components/song-card";
import { fillGrid, type Span } from "@/lib/grid";
import { openGraphDefaults } from "@/lib/site";
import { getPublishedSongs } from "@/lib/tracks";

const description = "Songs I've made, each with a short preview and a few words about it.";

export const metadata: Metadata = {
  title: "Music",
  description,
  alternates: { canonical: "/music" },
  openGraph: { ...openGraphDefaults, url: "/music", title: "Music", description },
};

// Music, in the style of the book cards: each song's cover as a record sleeve.
// Every card opens the song's article, with its preview player at the top.
export default async function MusicPage() {
  const songs = await getPublishedSongs();
  const { spans, fillers } = fillGrid(songs.map((s) => (s.cardSize === "wide" ? 2 : 1)));

  return (
    <>
      <SectionHeader title="music">
        {/* TODO(Ivan): rewrite in your own words. */}
        Songs I&apos;ve made in my spare time. Each one has a short preview and a few words about how it came
        together.
      </SectionHeader>

      {songs.length === 0 ? (
        <StillGrowing section="music" />
      ) : (
        <CardGrid>
          {songs.map((song, i) => (
            <SongCard key={song.id} song={song} span={spans[i]} index={i} />
          ))}
          {fillers.map((span, i) => (
            <MoreCard key={i} span={span} index={songs.length + i} />
          ))}
        </CardGrid>
      )}
    </>
  );
}

/**
 * Fills a short last row. Not a link while Ivan's music isn't public.
 * TODO(Ivan): once it is, link it to the Spektral profile (e.g. "More from Spektral").
 */
function MoreCard({ span, index }: { span: Span; index: number }) {
  return (
    <Card label="Music · More" index={index} className={spanClass(span)}>
      <p className="font-serif text-2xl leading-tight text-fg-muted sm:text-3xl">More on the way.</p>
    </Card>
  );
}
