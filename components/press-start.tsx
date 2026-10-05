// "PRESS START" in our own pixel letters (a 5×7 grid each), drawn as an SVG
// so there's no font to load and the squares stay sharp at any size. Cream
// letters with a hard dark shadow one pixel down-right (the 8-bit trick), so
// they read on light and dark screenshots alike, in both themes.
// The game cards show it on hover; see `press-start-blink` in globals.css.

const GLYPHS: Record<string, string[]> = {
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
};

const TEXT = "PRESS START";
/** Each letter is 5 pixels wide plus 1 of space; a space is 6. */
const ADVANCE = 6;
const WIDTH = TEXT.length * ADVANCE - 1;

/** One path for all the pixels: each run of filled pixels in a row becomes one rectangle. */
const PIXELS = [...TEXT]
  .flatMap((char, i) =>
    (GLYPHS[char] ?? []).flatMap((row, y) =>
      [...row.matchAll(/#+/g)].map((run) => `M${i * ADVANCE + run.index} ${y}h${run[0].length}v1h-${run[0].length}z`),
    ),
  )
  .join("");

export function PressStart({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${WIDTH + 1} 8`} shapeRendering="crispEdges" className={className}>
      <path d={PIXELS} fill="#1c1b1a" transform="translate(1 1)" />
      <path d={PIXELS} fill="#fff4dc" />
    </svg>
  );
}
