import Image from "next/image";
import { PressStart } from "@/components/press-start";

type Hover = "grow" | "pop";

// A screenshot in a thin window frame with a slim title bar and a soft
// shadow, centred in the lower part of a card and cut off by its bottom edge
// (chester.how's project cards). Placed against the card itself, which is
// `relative` and clips it. What happens on hover or focus of the card:
// - "grow" (projects): it grows to 105% (chester's timing: 150 ms, ease-out).
// - "pop" (games): it pops up out of the card: lifts 12 px (8 px on phones),
//   grows to 104% from its bottom centre and tilts −1.5° (wide: −1°), its
//   shadow deepens, the title-bar dots light up and "PRESS START" blinks on
//   the screen. Up in 250 ms with a slight overshoot, back in 200 ms ease-out.
// With reduced motion nothing moves; the shadow and dots still change and
// "PRESS START" shows without blinking.
export function FramedScreenshot({
  src,
  alt,
  wide = false,
  hover = "grow",
  className = "top-[30%]",
}: {
  src: string;
  alt: string;
  wide?: boolean;
  hover?: Hover;
  /** Where the window's top sits in the card (a `top-*` class). */
  className?: string;
}) {
  const pop = hover === "pop";
  const motion = pop
    ? // The hover rule carries the way up (250 ms, overshoot); the base rule the way back.
      `origin-bottom transition-[translate,scale,rotate,box-shadow] duration-200 ease-out group-focus-within:duration-250 group-focus-within:ease-[cubic-bezier(0.34,1.56,0.64,1)] group-focus-within:shadow-[0_22px_40px_-12px_rgb(0_0_0/0.45)] group-hover:duration-250 group-hover:ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:shadow-[0_22px_40px_-12px_rgb(0_0_0/0.45)] motion-safe:group-focus-within:-translate-y-2 motion-safe:group-focus-within:scale-104 motion-safe:group-hover:-translate-y-2 motion-safe:group-hover:scale-104 motion-safe:sm:group-focus-within:-translate-y-3 motion-safe:sm:group-hover:-translate-y-3 ${wide ? "motion-safe:group-focus-within:-rotate-1 motion-safe:group-hover:-rotate-1" : "motion-safe:group-focus-within:rotate-[-1.5deg] motion-safe:group-hover:rotate-[-1.5deg]"}`
    : "transition-transform motion-safe:group-focus-within:scale-105 motion-safe:group-hover:scale-105";

  return (
    <div className={`pointer-events-none absolute inset-x-0 -bottom-8 flex justify-center ${className} ${wide ? "px-[12%]" : "px-[7%]"}`}>
      <div className={`flex w-full flex-col overflow-hidden rounded-t-lg border border-rule bg-bg shadow-[0_10px_30px_-10px_rgb(0_0_0/0.3)] ${motion}`}>
        <TitleBar lit={pop} />
        <div className="relative min-h-0 grow">
          <Image
            src={src}
            alt={alt}
            fill
            sizes={wide ? "(min-width: 1024px) 40vw, 90vw" : "(min-width: 1024px) 22vw, 45vw"}
            className="object-cover object-top"
          />
          {pop && (
            // Centred at 60% of the part of the screen above the card's edge (the
            // bottom 2rem is cut off). Hidden until the hover's blink starts.
            <PressStart className="absolute top-[calc(60%-1.2rem)] left-1/2 h-3 w-[99px] -translate-1/2 opacity-0 motion-safe:group-focus-within:press-start-blink motion-safe:group-hover:press-start-blink motion-reduce:group-focus-within:opacity-100 motion-reduce:group-hover:opacity-100 sm:h-4 sm:w-[132px]" />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A window's slim title bar with three dots, grey at rest. With `lit`, the
 * dots turn soft peach, yellow and green while the card is hovered or focused.
 */
export function TitleBar({ lit = false, className = "h-4 px-2" }: { lit?: boolean; className?: string }) {
  const dot = `size-1.5 rounded-full bg-rule ${lit ? "transition-colors duration-200" : ""}`;
  return (
    <div aria-hidden="true" className={`flex shrink-0 items-center gap-1 border-b border-rule ${className}`}>
      <span className={`${dot} ${lit ? "group-focus-within:bg-[#f0a983] group-hover:bg-[#f0a983]" : ""}`} />
      <span className={`${dot} ${lit ? "group-focus-within:bg-[#e8c95c] group-hover:bg-[#e8c95c]" : ""}`} />
      <span className={`${dot} ${lit ? "group-focus-within:bg-[#9ccc78] group-hover:bg-[#9ccc78]" : ""}`} />
    </div>
  );
}
