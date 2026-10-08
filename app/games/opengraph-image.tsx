import { sectionOgAlt, sectionOgImage, sectionOgSize } from "@/lib/section-og";

// Link preview for the Games page ("games."), drawn at build time.
export const alt = sectionOgAlt("games");
export const size = sectionOgSize;
export const contentType = "image/png";

export default async function Image() {
  return sectionOgImage("games");
}
