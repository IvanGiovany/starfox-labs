import { sectionOgAlt, sectionOgImage, sectionOgSize } from "@/lib/section-og";

// Link preview for the Reading page ("reading."), drawn at build time.
export const alt = sectionOgAlt("reading");
export const size = sectionOgSize;
export const contentType = "image/png";

export default async function Image() {
  return sectionOgImage("reading");
}
