import Image from "next/image";
import type { CSSProperties } from "react";
import { HOME_LAB, type LabBox } from "@/lib/home-lab";
import styles from "./home-lab.module.css";
import { SectionBannerMotion } from "./section-banner-motion";

// The little illustrated lab under the home page's intro: the lab image, with
// three quiet movements on top (lib/home-lab.ts says where each one sits):
// code scrolling on the monitor a line at a time with a blinking cursor, the
// bird on the sill glancing left and right (a 3-frame sprite), and the plant's
// foliage swaying over its still pot. Decorative, so hidden from screen readers;
// only the pause button takes clicks. Motion pauses with the button (the same
// remembered choice as the section banners), off screen, in a hidden tab,
// during page transitions, and isn't there at all with reduced motion.

// The largest the lab is drawn: half the 1460 px page column on desktop (the
// intro's 2 × 2 cells), 40rem on tablets, the full width on phones.
const LAB_MAX_PX = 730;
const LAB_SIZES = `(min-width: 1540px) ${LAB_MAX_PX}px, (min-width: 1024px) 50vw, (min-width: 640px) 640px, 100vw`;
const QUALITY = 95;

const boxStyle = (box: LabBox): CSSProperties => ({
  left: `${box.left}%`,
  top: `${box.top}%`,
  width: `${box.width}%`,
  height: `${box.height}%`,
});

/** A small image's `sizes`: its share of the lab at the lab's largest. */
const smallSizes = (widthPercent: number) => `${Math.ceil((widthPercent / 100) * LAB_MAX_PX)}px`;

export function HomeLab({ className = "" }: { className?: string }) {
  const { lab, bird, plant, screen, birdBox, plantBox, plantPivot } = HOME_LAB;
  const labRatio = lab.width / lab.height;
  // Boxes are % of the lab's width and height; a square bird frame and the
  // 2:3 plant get their height from their width and the lab's shape.
  const birdFrame: LabBox = { ...birdBox, height: birdBox.width * labRatio };
  const plantFrame: LabBox = { ...plantBox, height: plantBox.width * labRatio * (plant.height / plant.width) };

  return (
    <div className={`${styles.lab} ${className}`} data-motion-scope style={{ "--lab-ratio": labRatio } as CSSProperties}>
      <div className={styles.stage} aria-hidden="true">
        <Image src={lab} alt="" fill sizes={LAB_SIZES} quality={QUALITY} loading="eager" className={styles.fill} />

        <Screen box={screen} />

        <div
          className={styles.plant}
          style={{ ...boxStyle(plantFrame), "--pivot-x": plantPivot.x, "--pivot-y": plantPivot.y } as CSSProperties}
        >
          <Image src={plant} alt="" fill sizes={smallSizes(plantBox.width)} quality={QUALITY} loading="eager" className={`${styles.fill} ${styles.pot}`} />
          <Image
            src={plant}
            alt=""
            fill
            sizes={smallSizes(plantBox.width)}
            quality={QUALITY}
            loading="eager"
            className={`${styles.fill} ${styles.foliage} ${styles.anim}`}
          />
        </div>

        <div className={styles.bird} style={boxStyle(birdFrame)}>
          <Image src={bird} alt="" sizes={smallSizes(birdBox.width * 3)} quality={QUALITY} loading="eager" className={`${styles.sprite} ${styles.anim}`} />
        </div>
      </div>
      <SectionBannerMotion className={styles.toggle} />
    </div>
  );
}

// Code on the monitor: short bars in a few syntax colours, indented like real
// code. The list is drawn twice so it can scroll up one line at a time forever
// without a seam.
const CODE_LINES: { indent: number; width: number; tone: 0 | 1 | 2 | 3 }[] = [
  { indent: 0, width: 46, tone: 0 },
  { indent: 1, width: 62, tone: 1 },
  { indent: 2, width: 38, tone: 2 },
  { indent: 2, width: 54, tone: 1 },
  { indent: 1, width: 28, tone: 3 },
  { indent: 0, width: 18, tone: 0 },
  { indent: 0, width: 0, tone: 0 },
  { indent: 0, width: 52, tone: 2 },
  { indent: 1, width: 66, tone: 1 },
  { indent: 1, width: 34, tone: 3 },
];

function Screen({ box }: { box: LabBox }) {
  const lines = [...CODE_LINES, ...CODE_LINES];
  return (
    <div className={styles.screen} style={{ ...boxStyle(box), "--lines": CODE_LINES.length } as CSSProperties}>
      {/* The code scrolls in a window above the bottom line, which is the prompt with the cursor. */}
      <div className={styles.codeWindow}>
        <div className={`${styles.code} ${styles.anim}`}>
          {lines.map((line, i) => (
            <span key={i} className={styles.line}>
              {line.width > 0 && (
                <span className={styles.bar} data-tone={line.tone} style={{ marginLeft: `${line.indent * 8}%`, width: `${line.width}%` }} />
              )}
            </span>
          ))}
        </div>
      </div>
      <span className={`${styles.cursor} ${styles.anim}`} />
    </div>
  );
}
