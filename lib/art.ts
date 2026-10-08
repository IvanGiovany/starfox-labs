// Ivan's own pixel art for the empty "Still growing" states (components/sprout-art.tsx).
//
// To use your own art instead of the built-in sprout: put two images in
// public/art/ (a still and an animated WebP, transparent background, drawn at
// 2× the shown size, like the footer's Shinx) and fill this in, e.g.
//   export const sproutArt = { still: "/art/sprout-still.webp", animated: "/art/sprout-grow.webp", width: 128, height: 128 };
// The still shows with reduced motion; the animation everywhere else.
export const sproutArt: { still: string; animated: string; width: number; height: number } | null = null;
