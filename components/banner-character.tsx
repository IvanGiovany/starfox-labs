"use client";

import Image, { type StaticImageData } from "next/image";
import styles from "./section-banner.module.css";

// The character image in a section banner, over a real preview <img> (a tiny
// transparent data URL, decoded at once). Next's `placeholder` paints the
// preview as a CSS background on the still-loading <img>, which Firefox
// doesn't reliably draw (the character area showed blank), so the preview is
// its own element. Once the full image has loaded *and decoded*, the banner
// gets data-character-ready and the CSS hides the preview, with no fade, so
// there's never a frame without a character, and no soft preview edge left
// peeking around the sharp one.
export function BannerCharacter({
  src,
  preview,
  sizes,
  quality,
}: {
  src: StaticImageData;
  preview?: string;
  sizes: string;
  quality: number;
}) {
  function ready(img: HTMLImageElement) {
    const banner = img.closest("[data-section-banner]");
    const mark = () => banner?.setAttribute("data-character-ready", "");
    // decode() resolves once the pixels can be painted; fall back to marking at once.
    if (typeof img.decode === "function") img.decode().then(mark, mark);
    else mark();
  }

  return (
    <>
      {preview && (
        // A data URL already in the HTML: next/image would only add overhead here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" decoding="sync" className={`${styles.image} ${styles.preview}`} />
      )}
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        quality={quality}
        loading="eager"
        fetchPriority="high"
        className={styles.image}
        onLoad={(event) => ready(event.currentTarget)}
      />
    </>
  );
}
