import Image from "next/image";
import { BadgeRow } from "@/components/badge";
import { Card } from "@/components/card";
import { spanClass } from "@/components/card-grid";
import type { Span } from "@/lib/grid";
import { hobbyCaption } from "@/lib/hobbies";
import type { Hobby } from "@/lib/hobbies-loader";

// A hobby card, chester-style, in one of three looks (the item's card style):
// - photo: the photo fills the card with a white caption; on hover or focus it
//   slides down 48 px to show the label row, and the caption gets a dark backing.
// - cut-out: the object stands behind the badges and title (over a gradient
//   from the card's colour); on hover it grows to 105% and comes in front while
//   the text fades to 20% (to nothing on keyboard focus).
// - none: a text card: badges, a big serif title, subtitle and note.
// Timings are chester's (Tailwind's default 150 ms). Movement is `motion-safe:`
// only; with reduced motion the caption backing, the stacking and the fade stay.
export function HobbyCard({ hobby, span, index }: { hobby: Hobby; span: Span; index: number }) {
  const sizes = span === 2 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw";
  return (
    <Card
      label={hobby.category ? `Hobbies · ${hobby.category}` : "Hobbies"}
      href={hobby.href ?? undefined}
      index={index}
      className={spanClass(span)}
    >
      {hobby.style === "photo" && hobby.imageUrl ? (
        <>
          {/* Positioned, so it covers the label row until it slides down. */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl transition-[translate] motion-safe:group-focus-within:translate-y-12 motion-safe:group-hover:translate-y-12">
            <Image src={hobby.imageUrl} alt={hobby.imageAlt} fill sizes={sizes} className="object-cover" />
          </div>
          <p className="relative z-10 -mx-2 -mb-2 self-start sm:-mx-3 sm:-mb-3">
            <span className="line-clamp-2 rounded-lg px-2 py-1 text-sm text-white/70 transition-colors group-focus-within:bg-black/70 group-hover:bg-black/70">
              {hobbyCaption(hobby.caption, hobby.title)}
            </span>
          </p>
        </>
      ) : hobby.style === "cutout" && hobby.imageUrl ? (
        <>
          {/* Behind the text at rest (the card is `isolate`, so -z-10 stays above its background). */}
          <div className="pointer-events-none absolute inset-0 -z-10 transition-[scale] group-focus-within:z-10 group-hover:z-10 motion-safe:group-focus-within:scale-105 motion-safe:group-hover:scale-105">
            <Image src={hobby.imageUrl} alt={hobby.imageAlt} fill sizes={sizes} className="object-contain" />
          </div>
          {/* The gradient sits behind the text and reaches up over the cut-out, without taking up height. */}
          <div className="relative isolate -mx-4 -mb-4 px-4 pb-4 transition-opacity group-focus-within:opacity-0 group-hover:opacity-20 before:absolute before:inset-x-0 before:-top-16 before:bottom-0 before:-z-10 before:bg-linear-to-t before:from-bg-raised before:from-40% before:to-transparent group-hover:before:from-bg-raised-hover sm:-mx-5 sm:-mb-5 sm:px-5 sm:pb-5">
            <BadgeRow items={hobby.badges} className="mb-2 sm:mb-3" />
            <h2 className="line-clamp-2 shrink-0 font-serif text-xl leading-[1.05] font-light sm:text-3xl xl:text-4xl">{hobby.title}</h2>
          </div>
        </>
      ) : (
        <>
          <BadgeRow items={hobby.badges} className="mb-2 sm:mb-3" />
          <h2 className="line-clamp-2 shrink-0 font-serif text-xl leading-[1.05] font-light sm:text-4xl lg:text-3xl xl:text-5xl">{hobby.title}</h2>
          {/* Cells are short on phones (title only) and on small laptops (no note); measured. */}
          {hobby.subtitle && <p className="mt-2 hidden text-sm text-fg-muted sm:line-clamp-1">{hobby.subtitle}</p>}
          {hobby.note && <p className="hidden text-sm sm:line-clamp-1 lg:hidden xl:line-clamp-1">{hobby.note}</p>}
        </>
      )}
    </Card>
  );
}
