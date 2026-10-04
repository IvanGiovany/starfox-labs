import Image from "next/image";

// A screenshot in a thin window frame with a slim title bar and a soft
// shadow, centred in the lower part of a card and cut off by its bottom edge
// (chester.how's project cards). On hover or focus of the card it grows to
// 105% (chester's timing: 150 ms, ease-out); not with reduced motion.
// Placed against the card itself, which is `relative` and clips it.
export function FramedScreenshot({ src, alt, wide = false }: { src: string; alt: string; wide?: boolean }) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 top-[30%] -bottom-8 flex justify-center ${wide ? "px-[12%]" : "px-[7%]"}`}>
      <div className="flex w-full flex-col overflow-hidden rounded-t-lg border border-rule bg-bg shadow-[0_10px_30px_-10px_rgb(0_0_0/0.3)] transition-transform motion-safe:group-focus-within:scale-105 motion-safe:group-hover:scale-105">
        <div aria-hidden="true" className="flex h-4 shrink-0 items-center gap-1 border-b border-rule px-2">
          <span className="size-1.5 rounded-full bg-rule" />
          <span className="size-1.5 rounded-full bg-rule" />
          <span className="size-1.5 rounded-full bg-rule" />
        </div>
        <div className="relative min-h-0 grow">
          <Image
            src={src}
            alt={alt}
            fill
            sizes={wide ? "(min-width: 1024px) 40vw, 90vw" : "(min-width: 1024px) 22vw, 45vw"}
            className="object-cover object-top"
          />
        </div>
      </div>
    </div>
  );
}
