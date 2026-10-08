import Image from "next/image";
import { sproutArt } from "@/lib/art";

// A seed sprouting, in pixel art, for the "Still growing" empty states. Drawn
// here (original, 16 × 16 pixels, shown 4× as an SVG so it stays crisp). Four
// frames switch with hard cuts, like a sprite: the seed on its mound, the seed
// cracking, a shoot, then two leaves, held a while before it starts again
// (`sprout-f1`…`sprout-f4` in globals.css). With reduced motion only the last
// frame shows. Decorative: the words next to it say what it means.
// Ivan's own art replaces it when lib/art.ts names it.

/** One letter per pixel; "." is empty. */
const COLORS: Record<string, string> = {
  d: "#5a3d27", // soil, shadow
  s: "#7a5434", // soil
  l: "#9a6c42", // soil, lit top
  k: "#7d5a2f", // seed husk, dark
  y: "#c9a15e", // seed
  g: "#4f8a3c", // stem
  G: "#74b552", // leaf
  h: "#a6d97f", // leaf, highlight
};

const MOUND = [
  "....llllllll....",
  "..lllsllllslll..",
  ".sssssdssssdsss.",
  ".dddddddddddddd.",
];

const blank = (rows: number) => Array<string>(rows).fill("................");

/** Rows 0–11 of each frame (the mound is rows 12–15 of all of them). */
const FRAMES: string[][] = [
  // 1. The seed, resting on the soil.
  [...blank(10), "................", ".......yk......."],
  // 2. It cracks; the tip of a shoot.
  [...blank(10), "........g.......", ".......ygk......"],
  // 3. A shoot with its first leaf.
  [...blank(7), ".......Gg.......", "......G.g.......", "........g.......", "........g.......", ".......ygk......"],
  // 4. Two leaves.
  [
    ...blank(3),
    "......hG.Gh.....",
    ".....hGGgGGh....",
    "......GGgGG.....",
    "........g.......",
    "........g.......",
    "........g.......",
    "........g.......",
    "........g.......",
    "........g.......",
  ],
];

/** Each run of same-coloured pixels in a row as one rectangle. */
function pixels(rows: string[]) {
  const rects: { x: number; y: number; w: number; fill: string }[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const ch = row[x];
      let w = 1;
      while (row[x + w] === ch) w++;
      if (ch !== ".") rects.push({ x, y, w, fill: COLORS[ch] });
      x += w;
    }
  });
  return rects;
}

export function SproutArt({ size = 64 }: { size?: number }) {
  if (sproutArt) {
    const layer = "absolute inset-0 size-full object-contain";
    return (
      <span aria-hidden="true" className="relative block shrink-0" style={{ width: size, height: size }}>
        <Image src={sproutArt.still} alt="" width={sproutArt.width} height={sproutArt.height} unoptimized className={`${layer} motion-safe:hidden`} />
        {/* Animated WebP: next/image would turn it into a still, so it's served as is. */}
        <Image src={sproutArt.animated} alt="" width={sproutArt.width} height={sproutArt.height} unoptimized className={`${layer} motion-reduce:hidden`} />
      </span>
    );
  }

  const mound = pixels(MOUND).map((r) => ({ ...r, y: r.y + 12 }));
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="block shrink-0 [image-rendering:pixelated]"
    >
      {FRAMES.map((frame, i) => (
        <g key={i} className={`sprout-f${i + 1}`}>
          {pixels(frame).map((r) => (
            <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
          ))}
        </g>
      ))}
      {mound.map((r) => (
        <rect key={`m${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}
