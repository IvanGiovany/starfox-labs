import { sectionOgAlt, sectionOgImage, sectionOgSize } from "@/lib/section-og";

// Link preview for the Music page ("music."), drawn at build time.
export const alt = sectionOgAlt("music");
export const size = sectionOgSize;
export const contentType = "image/png";

export default async function Image() {
  return sectionOgImage("music");
}
