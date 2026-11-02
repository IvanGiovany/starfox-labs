import type { StaticImageData } from "next/image";
import gamesBack from "@/assets/section-banners/games-back.webp";
import games from "@/assets/section-banners/games.webp";
import hobbiesBack from "@/assets/section-banners/hobbies-back.webp";
import hobbies from "@/assets/section-banners/hobbies.webp";
import musicBack from "@/assets/section-banners/music-back.webp";
import music from "@/assets/section-banners/music.webp";
import projectsBack from "@/assets/section-banners/projects-back.webp";
import projects from "@/assets/section-banners/projects.webp";
import readingBack from "@/assets/section-banners/reading-back.webp";
import reading from "@/assets/section-banners/reading.webp";
import writingBack from "@/assets/section-banners/writing-back.webp";
import writing from "@/assets/section-banners/writing.webp";
import type { SectionKey } from "@/lib/section-meta";

// The animated banners behind the six section titles (components/section-banner.tsx),
// requested by Ivan (2026-11-02): Jujutsu Kaisen characters as player-card art,
// one per section. Each banner is two images on the same 2172 × 724 canvas, a
// painted backdrop and the character on transparency, which drift separately,
// plus the numbers its layout needs. Every section must have one: a missing
// entry fails the build.

/**
 * The width the 3:1 art is actually painted at (object-fit: cover), before cropping:
 * - below 720 px the band is 15rem (240 px) tall, so 720 px;
 * - 720–1023 px the band is a third of the width, so the viewport width;
 * - 1024–1439 px the banner can grow taller than a third of the width (narrow
 *   text column, 22rem minimum), so up to ~1440 px;
 * - from 1440 px the art is width-fitted, so the viewport width.
 * The browser multiplies by the screen's pixel ratio; the optimizer never
 * enlarges past the 2172 px source. Shared by the banner and the header's
 * prefetch, so both ask for exactly the same image URLs.
 */
export const BANNER_SIZES = "(max-width: 719px) 720px, (max-width: 1023px) 100vw, (max-width: 1439px) 1440px, 100vw";
/** Line art with flat colour bands and blurs at the default 75 (allowed in next.config.ts). */
export const BANNER_QUALITY = 95;

export type BannerAccent = {
  shape: "wave" | "spark" | "paper" | "leaf" | "ring";
  /** Position of its centre in the banner; at 640 px and up the art spans the banner's width, so x matches the image. */
  x: string;
  y: string;
  /** Drawn size in px (the wave's width; the ring's diameter). */
  size: number;
  /** Seconds per loop and a start offset, so accents don't move in step. */
  dur?: number;
  delay?: number;
  /** Where a floating accent drifts to: a few px and degrees. */
  dx?: number;
  dy?: number;
  rot?: number;
};

/**
 * A flowing energy / ink trace, drawn on the art's canvas in 300 × 100 units
 * (x 0–300 is the image's width), behind the character. Kept right of the name
 * plate (x ≥ ~160); where it passes behind the character, the character hides it.
 * All of a section's traces flow on one shared cycle (see the CSS).
 */
export type BannerTrace = {
  /** SVG path data in 300 × 100 units. */
  d: string;
  color?: "accent" | "highlight";
  /** Stroke width in canvas units (1 unit ≈ 6 px on a 1920 px screen). */
  width: number;
  /** Dash and gap lengths; each cycle the dashes advance one dash + gap. */
  dash: [number, number];
  /** Flow the other way. */
  reverse?: boolean;
};

export type SectionBannerArt = {
  /** The character on transparency (the same file as layers.front), or a whole opaque card when there are no layers. */
  image: StaticImageData;
  /**
   * The layered card: `front` the character and props on transparency, `back`
   * a painted backdrop with nothing missing behind the character. Same canvas
   * (pixel size, alignment), so they crop identically. Without `back`, flat
   * ink planes in the palette are drawn instead.
   */
  layers?: { back?: StaticImageData; front: StaticImageData };
  // The character's tiny transparent preview lives in lib/section-banner-previews.json,
  // read only by components/section-banner.tsx (server-only), so the ~14 KB data
  // URLs never reach the header's prefetch or any client bundle.
  /** Where the art is anchored when it's cropped (object-position): kept on the faces. */
  focal: string;
  /**
   * Width of the text's name plate on wide screens, as a share of the banner
   * (it starts at the banner's left edge; the slant adds ~5% at the top).
   * Kept clear of the character's face.
   */
  plateWidth: string;
  palette: { shadow: string; background: string; accent: string; highlight: string };
  /**
   * Breathing, as fractions of the image: `neck` is the height of the line
   * between head (rides up, never stretched) and body (swells from its base);
   * `x` is the body's centre, where the swell is anchored; `amount` is the
   * swell at full breath (0.016 = 1.6%).
   */
  breath: { neck: number; x: number; amount: number };
  /** 2–3 section-specific traces, shown at every width (also on phones). */
  traces: BannerTrace[];
  /** Small drawn accents, shown from 640 px up. */
  accents: BannerAccent[];
};

// Faces in the art (x of the image): Toji ~57%, Nanami ~74%, Sukuna ~85%,
// Gojo ~77%, Yuta ~61% and Rika ~70%, Mahito ~62%. Accents stay off them and
// to the right of the name plate.
export const SECTION_BANNERS: Record<SectionKey, SectionBannerArt> = {
  projects: {
    image: projects,
    layers: { back: projectsBack, front: projects },
    focal: "68% 38%",
    plateWidth: "46%",
    palette: { shadow: "#222b2b", background: "#587d7a", accent: "#67bdc5", highlight: "#f3dfbe" },
    breath: { neck: 0.5, x: 0.62, amount: 0.024 },
    // Toji: hard, angular energy (zigzag strikes) rising behind him.
    traces: [
      { d: "M162 94 L188 76 L182 72 L214 54 L208 50 L246 28 L240 24 L276 6", width: 0.7, dash: [16, 10] },
      { d: "M300 82 L270 66 L276 62 L240 44 L246 40 L214 24", color: "highlight", width: 0.45, dash: [6, 7] },
      { d: "M170 20 L196 12 L190 8 L222 2", width: 0.4, dash: [8, 6], reverse: true },
    ],
    accents: [
      { shape: "spark", x: "52%", y: "10%", size: 16, dur: 5, delay: -1 },
      { shape: "ring", x: "88%", y: "30%", size: 200, dur: 90 },
    ],
  },
  writing: {
    image: writing,
    layers: { back: writingBack, front: writing },
    focal: "82% 35%",
    plateWidth: "52%",
    palette: { shadow: "#302333", background: "#6b485b", accent: "#ca655e", highlight: "#f3dec6" },
    breath: { neck: 0.52, x: 0.78, amount: 0.022 },
    // Nanami: long, even ink ribbons, drawn steadily (ordered, unhurried).
    traces: [
      { d: "M160 88 C190 70 206 98 236 80 S282 58 304 70", width: 0.9, dash: [40, 18] },
      { d: "M166 18 C196 6 214 32 244 16 S286 2 304 12", color: "highlight", width: 0.5, dash: [22, 14], reverse: true },
      { d: "M178 60 C200 52 214 66 236 58", width: 0.4, dash: [10, 8] },
    ],
    accents: [
      { shape: "paper", x: "58%", y: "10%", size: 24, dur: 11, dx: 10, dy: -6, rot: 10 },
      { shape: "spark", x: "96%", y: "88%", size: 14, dur: 6, delay: -3 },
    ],
  },
  reading: {
    image: reading,
    layers: { back: readingBack, front: reading },
    focal: "85% 30%",
    plateWidth: "52%",
    palette: { shadow: "#2e2521", background: "#b78c41", accent: "#c4544a", highlight: "#f5e6c8" },
    breath: { neck: 0.44, x: 0.72, amount: 0.02 },
    // Sukuna: sharp parallel cuts in the open sky above him.
    traces: [
      { d: "M168 30 L206 4", width: 0.75, dash: [10, 6] },
      { d: "M184 36 L228 6", color: "highlight", width: 0.45, dash: [4, 6] },
      { d: "M204 32 L242 6", width: 0.6, dash: [12, 8] },
    ],
    accents: [
      { shape: "paper", x: "60%", y: "12%", size: 24, dur: 12, dx: 10, dy: -6, rot: 9 },
      { shape: "paper", x: "72%", y: "7%", size: 18, dur: 14, delay: -6, dx: -8, dy: -6, rot: -10 },
    ],
  },
  music: {
    image: music,
    layers: { back: musicBack, front: music },
    focal: "78% 28%",
    plateWidth: "52%",
    palette: { shadow: "#221f3c", background: "#784454", accent: "#65bedb", highlight: "#f4e6d0" },
    breath: { neck: 0.36, x: 0.76, amount: 0.024 },
    // Gojo: sound waves running across the stage behind him.
    traces: [
      { d: "M160 40 Q170 30 180 40 T200 40 T220 40 T240 40 T260 40 T280 40 T300 40", width: 0.6, dash: [8, 5] },
      { d: "M160 58 Q172 46 184 58 T208 58 T232 58 T256 58 T280 58 T304 58", color: "highlight", width: 0.4, dash: [3, 4], reverse: true },
      { d: "M164 22 Q176 14 188 22 T212 22 T236 22 T260 22", width: 0.35, dash: [6, 5] },
    ],
    accents: [
      { shape: "wave", x: "60%", y: "10%", size: 140, dur: 7 },
      { shape: "spark", x: "96%", y: "88%", size: 14, dur: 6, delay: -4 },
    ],
  },
  games: {
    image: games,
    layers: { back: gamesBack, front: games },
    focal: "70% 36%",
    plateWidth: "48%",
    palette: { shadow: "#20292a", background: "#9b733e", accent: "#68a89f", highlight: "#f4e8cc" },
    breath: { neck: 0.52, x: 0.64, amount: 0.02 },
    // Yuta and Rika: wide orbiting arcs of cursed energy around the pair.
    traces: [
      { d: "M166 72 A70 34 0 0 1 296 40", width: 0.7, dash: [18, 10] },
      { d: "M178 92 A80 40 0 0 1 300 62", color: "highlight", width: 0.45, dash: [6, 8], reverse: true },
      { d: "M196 22 A50 22 0 0 1 292 14", width: 0.4, dash: [10, 7] },
    ],
    accents: [
      { shape: "spark", x: "53%", y: "8%", size: 18, dur: 5 },
      { shape: "spark", x: "97%", y: "62%", size: 14, dur: 7, delay: -4 },
    ],
  },
  hobbies: {
    image: hobbies,
    layers: { back: hobbiesBack, front: hobbies },
    focal: "75% 35%",
    plateWidth: "47%",
    palette: { shadow: "#233127", background: "#788b68", accent: "#4b9f9b", highlight: "#f3e4c2" },
    breath: { neck: 0.42, x: 0.66, amount: 0.022 },
    // Mahito: stitched seams winding like vines.
    traces: [
      { d: "M162 88 C182 60 206 92 222 66 S252 40 276 58 S296 76 304 70", width: 0.55, dash: [3, 3] },
      { d: "M168 20 C192 30 210 8 236 18 S270 30 304 14", color: "highlight", width: 0.45, dash: [2.5, 3.5], reverse: true },
      { d: "M180 54 C196 46 208 60 224 50", width: 0.4, dash: [3, 4] },
    ],
    accents: [
      { shape: "leaf", x: "54%", y: "12%", size: 24, dur: 12, dx: 12, dy: 8, rot: 14 },
      { shape: "leaf", x: "97%", y: "86%", size: 20, dur: 14, delay: -6, dx: -8, dy: 8, rot: -16 },
    ],
  },
};
