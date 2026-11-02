import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { BannerAccent, BannerTrace, SectionBannerArt } from "@/lib/section-banners";
import type { SectionKey } from "@/lib/section-meta";
import { SectionBannerMotion } from "./section-banner-motion";
import styles from "./section-banner.module.css";

// A section page's title and intro over its illustration, like a game's player
// card, running edge to edge across the window (.page-shell in globals.css lets
// it span the full width; the text still starts on the page column's left
// edge). The character is on the right; the text sits on a slanted name plate
// in the art's own shadow colour, one strength across the whole text block,
// so it stays readable over any part of the art. Each section's title has its
// own lettering, matched to its character (CSS, keyed on data-section-banner).
// Below 1024 px the art is a band across the top and the plate sits below it.
// Motion is CSS only and small: the painted backdrop and the character drift
// as separate planes, with a few drawn accents (a waveform, paper, sparks,
// leaves, a dashed orbit) between them. Every layer pauses together. The small
// client part is just the pause button. Decorative: the art layers are hidden
// from screen readers.

// The width the 3:1 art is actually painted at (object-fit: cover), before cropping:
// - below 720 px the band is 15rem (240 px) tall, so 720 px;
// - 720–1023 px the band is a third of the width, so the viewport width;
// - 1024–1439 px the banner can grow taller than a third of the width (narrow
//   text column, 22rem minimum), so up to ~1440 px;
// - from 1440 px the art is width-fitted, so the viewport width.
// The browser multiplies by the screen's pixel ratio; the optimizer never
// enlarges past the 2172 px source.
const ART_SIZES = "(max-width: 719px) 720px, (max-width: 1023px) 100vw, (max-width: 1439px) 1440px, 100vw";

/** "68%" → 0.68 (the focal point's parts, for CSS calc). */
function fraction(percent = "50%") {
  return parseFloat(percent) / 100;
}

function ArtImage({ src, blur = false }: { src: SectionBannerArt["image"]; blur?: boolean }) {
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={ART_SIZES}
      quality={95}
      placeholder={blur ? "blur" : "empty"}
      loading="eager"
      fetchPriority="high"
      className={styles.image}
    />
  );
}

export function SectionBanner({ section, art, title, children }: { section: SectionKey; art: SectionBannerArt; title: string; children: ReactNode }) {
  const style = {
    "--banner-shadow": art.palette.shadow,
    "--banner-bg": art.palette.background,
    "--banner-accent": art.palette.accent,
    "--banner-highlight": art.palette.highlight,
    "--banner-focal": art.focal,
    "--plate-w": art.plateWidth,
    // Unitless fractions of the image for the breathing split (see the CSS).
    "--fx": fraction(art.focal.split(" ")[0]),
    "--fy": fraction(art.focal.split(" ")[1]),
    "--neck": art.breath.neck,
    "--body-x": art.breath.x,
    "--breath": art.breath.amount,
  } as CSSProperties;
  const accents = art.accents.map((accent, i) => <Accent key={i} {...accent} />);

  return (
    <header data-section-banner={section} data-layered={art.layers ? "" : undefined} className={styles.banner} style={style}>
      <div className={styles.art} aria-hidden="true">
        {art.layers ? (
          <>
            <div className={`${styles.plate} ${styles.back} ${styles.anim}`}>
              {art.layers.back ? <ArtImage src={art.layers.back} blur /> : <span className={styles.inkPlanes} />}
            </div>
            <Traces traces={art.traces} />
            {accents}
            {/* The character breathes: the same image twice, split at the neck.
                The body copy swells slightly from its base; the head copy rides
                up with it without being stretched, so faces keep their shape.
                (The same file, so the browser downloads it once.) */}
            <div className={`${styles.plate} ${styles.front} ${styles.anim}`}>
              <div className={`${styles.breathBody} ${styles.anim}`}>
                <ArtImage src={art.layers.front} />
              </div>
              <div className={`${styles.breathHead} ${styles.anim}`}>
                <ArtImage src={art.layers.front} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={`${styles.plate} ${styles.anim}`}>
              <ArtImage src={art.image} blur />
            </div>
            {accents}
          </>
        )}
      </div>

      <div className={styles.content}>
        {/* The full stop is its own span so each section's lettering can colour it. */}
        <h1 className={styles.title}>
          {title}
          <span className={styles.stop}>.</span>
        </h1>
        <div className={`mt-6 max-w-[65ch] text-base leading-relaxed sm:mt-8 sm:text-lg ${styles.intro}`}>{children}</div>
      </div>

      <SectionBannerMotion />
    </header>
  );
}

// ---- Energy traces (per section in lib/section-banners.ts) -------------------

// Strokes drawn on the art's 3:1 canvas (300 × 100 units, cropped like the art),
// between the backdrop and the character, so the character hides any part that
// passes behind it. Their dashes flow along the path; the dash pattern moves
// by exactly one repeat per loop, so there's no seam.
function Traces({ traces }: { traces: BannerTrace[] }) {
  return (
    <svg className={styles.traces} viewBox="0 0 300 100" preserveAspectRatio="xMidYMid slice">
      {traces.map((trace, i) => {
        const repeat = trace.dash[0] + trace.dash[1];
        const style = {
          "--repeat": `${trace.reverse ? repeat : -repeat}`,
          "--dur": `${trace.dur}s`,
        } as CSSProperties;
        return (
          <g key={i}>
            {/* A faint wide underlay gives the stroke body, like a brushed ribbon. */}
            <path d={trace.d} fill="none" stroke={`var(--banner-${trace.color ?? "accent"})`} strokeWidth={trace.width * 3} strokeLinecap="round" strokeLinejoin="round" opacity={0.18} />
            <path
              d={trace.d}
              className={`${styles.trace} ${styles.anim}`}
              style={style}
              fill="none"
              stroke={`var(--banner-${trace.color ?? "accent"})`}
              strokeWidth={trace.width}
              strokeDasharray={`${trace.dash[0]} ${trace.dash[1]}`}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}
    </svg>
  );
}

// ---- Drawn accents (placed per image in lib/section-banners.ts) --------------

// A sine stroke 2 periods longer than the window; sliding it by one period loops without a seam.
const WAVE_PATH = `M0 12 q10 -9 20 0${" t20 0".repeat(23)}`;

function Accent({ shape, x, y, size, dur = 10, delay = 0, dx = 6, dy = -8, rot = 6 }: BannerAccent) {
  const height = shape === "wave" ? 24 : size;
  const style = {
    left: x,
    top: y,
    width: size,
    height,
    "--dur": `${dur}s`,
    "--delay": `${delay}s`,
    "--dx": `${dx}px`,
    "--dy": `${dy}px`,
    "--rot": `${rot}deg`,
  } as CSSProperties;
  const motion = shape === "wave" ? "" : shape === "ring" ? styles.spin : shape === "spark" ? styles.twinkle : styles.float;

  return (
    <span className={`${styles.motif} ${motion} ${motion && styles.anim}`} style={style}>
      {shape === "wave" && (
        <svg viewBox={`0 0 ${size} 24`} width={size} height={24} className={styles.waveWindow}>
          <path d={WAVE_PATH} className={`${styles.wave} ${styles.anim}`} fill="none" stroke="var(--banner-highlight)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      {shape === "spark" && (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <path d="M12 0 14.2 9.8 24 12 14.2 14.2 12 24 9.8 14.2 0 12 9.8 9.8Z" fill="var(--banner-highlight)" stroke="var(--banner-shadow)" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      )}
      {shape === "paper" && (
        <svg viewBox="0 0 28 24" width={size} height={(size * 24) / 28}>
          <path d="M2 5 23 1 27 18 5 23Z" fill="var(--banner-highlight)" stroke="var(--banner-shadow)" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M6 9 21 6.5M7 14 22 11.5" stroke="var(--banner-accent)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )}
      {shape === "leaf" && (
        <svg viewBox="0 0 26 26" width={size} height={size}>
          <path d="M2 24C2 11 11 2 24 2 24 15 15 24 2 24Z" fill="var(--banner-accent)" stroke="var(--banner-shadow)" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M3 23 19 7" stroke="var(--banner-highlight)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )}
      {shape === "ring" && (
        <svg viewBox="0 0 100 100" width={size} height={size}>
          <circle cx="50" cy="50" r="48" fill="none" stroke="var(--banner-highlight)" strokeWidth="0.6" strokeDasharray="2 5" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}
