import Image from "next/image";

// Ivan's own art in the home intro, where chester.how has its leaf → maple
// GIF: Shinx lying down (fan art, drawn and animated by Ivan; see CLAUDE.md).
// At rest it shows the animation's first frame; hovering it cross-fades
// (0.5 s) to the animation, so the tail starts wagging. With reduced motion
// the animation is never shown. Decorative, so screen readers skip it.
// Files: public/art/shinx-still.webp and shinx-wag.webp (190 × 120, transparent).
export function PixelArt() {
  const layer = "absolute inset-0 size-full object-contain transition-opacity duration-500";
  return (
    <span aria-hidden="true" className="group/art relative mx-[0.1em] inline-block h-[1.15em] w-[1.82em] align-[-0.2em]">
      <Image src="/art/shinx-still.webp" alt="" width={190} height={120} unoptimized className={`${layer} motion-safe:group-hover/art:opacity-0`} />
      {/* Animated WebP: next/image would turn it into a still, so it's served as is. */}
      <Image src="/art/shinx-wag.webp" alt="" width={190} height={120} unoptimized className={`${layer} opacity-0 group-hover/art:opacity-100 motion-reduce:hidden`} />
    </span>
  );
}
