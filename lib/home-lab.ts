import type { StaticImageData } from "next/image";
import bird from "@/assets/home-lab/bird.webp";
import lab from "@/assets/home-lab/lab.webp";
import plant from "@/assets/home-lab/plant.webp";

// The little illustrated lab in the home page's intro (components/home-lab.tsx),
// Ivan's choice (2026-11-02): a desk with a code monitor, headphones, books and
// a beetle, and a window with a bird on the sill. Three transparent images
// drawn for it (assets/home-lab/): the lab itself, the bird as a 3-frame sprite,
// and a potted plant; plus where the moving parts sit.
//
// Every position is a percentage of the lab image (x from the left, y from the
// top), so the parts stay on their spots at any size.

/** A box on the lab image, in % of its width (left, width) and height (top, height). */
export type LabBox = { left: number; top: number; width: number; height: number };

export type HomeLabArt = {
  lab: StaticImageData;
  /** The monitor's screen, inside the bezel: the code lines and cursor are drawn clipped to it. */
  screen: LabBox;
  /** Sprite sheet: three equal square frames, looking left, front, right. */
  bird: StaticImageData;
  /** One frame's box (square; its height follows from the width and the lab's shape). */
  birdBox: Omit<LabBox, "height">;
  /** Pot and foliage, 2:3 portrait. */
  plant: StaticImageData;
  /** The plant's box (its height follows from its 2:3 shape). */
  plantBox: Omit<LabBox, "height">;
  /** Where the foliage meets the pot, as fractions of the plant image: the sway's pivot and the split line. */
  plantPivot: { x: number; y: number };
};

// Measured on the delivered art (lab.webp 1536 × 512, bird.webp 576 × 192,
// plant.webp 240 × 360):
// - screen: the empty dark screen inside the bezel (≈ x 116–600, y 102–341 px);
// - bird: its frame box sits so the feet (≈ 88% down each frame) land on the
//   window sill (≈ 70% down the lab), not the box's bottom edge;
// - plant: on the desk between the books and the window, its pot base on the
//   tabletop; the stem meets the pot about 68% down the plant image.
export const HOME_LAB: HomeLabArt = {
  lab,
  screen: { left: 7.55, top: 19.9, width: 31.5, height: 46.7 },
  bird,
  birdBox: { left: 84, top: 49, width: 8 },
  plant,
  plantBox: { left: 62, top: 46, width: 9 },
  plantPivot: { x: 0.5, y: 0.68 },
};
