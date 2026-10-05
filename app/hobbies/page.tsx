import type { Metadata } from "next";
import { Card } from "@/components/card";
import { CardGrid, spanClass } from "@/components/card-grid";
import { HobbyCard } from "@/components/hobby-card";
import { SectionHeader } from "@/components/section-header";
import { fillGrid, type Span } from "@/lib/grid";
import { hobbiesSummary } from "@/lib/hobbies";
import { getPublishedHobbies, type Hobby } from "@/lib/hobbies-loader";
import { openGraphDefaults } from "@/lib/site";

const description = "The things I do for fun away from the keyboard, and what I'm learning.";

export const metadata: Metadata = {
  title: "Hobbies",
  description,
  alternates: { canonical: "/hobbies" },
  openGraph: { ...openGraphDefaults, url: "/hobbies", title: "Hobbies", description },
};

// Hobbies, chester-style: photos that fill their card, cut-outs standing
// behind their title, and text cards with a big serif name.
export default async function HobbiesPage() {
  const hobbies = await getPublishedHobbies();
  const { spans, fillers } = fillGrid(hobbies.map((h) => (h.cardSize === "wide" ? 2 : 1)));

  return (
    <>
      <SectionHeader title="hobbies">
        {/* TODO(Ivan): rewrite in your own words. */}
        What I get up to when I&apos;m not at the keyboard, and the things I&apos;m learning right now. Some
        stick, some don&apos;t, and that&apos;s half the fun.
      </SectionHeader>

      {hobbies.length === 0 ? (
        <p className="pb-8 text-fg-muted">Nothing here yet.</p>
      ) : (
        <CardGrid>
          {hobbies.map((hobby, i) => (
            <HobbyCard key={hobby.id} hobby={hobby} span={spans[i]} index={i} />
          ))}
          {fillers.map((span, i) =>
            i === 0 ? (
              <AllCard key={i} hobbies={hobbies} span={span} index={hobbies.length} />
            ) : (
              <MoreCard key={i} span={span} index={hobbies.length + i} />
            ),
          )}
        </CardGrid>
      )}
    </>
  );
}

/** Fills a short last row: how many things, across how many hobbies. */
function AllCard({ hobbies, span, index }: { hobbies: Hobby[]; span: Span; index: number }) {
  return (
    <Card label="Hobbies · All" index={index} className={spanClass(span)}>
      <p className="font-serif text-2xl leading-tight text-fg-muted sm:text-3xl">
        {hobbiesSummary(hobbies).map((part, i) =>
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
    <Card label="Hobbies · More" href="/writing" index={index} className={spanClass(span)}>
      <p className="font-serif text-2xl leading-tight text-fg-muted sm:text-3xl">More in writing</p>
    </Card>
  );
}
