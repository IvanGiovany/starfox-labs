import { sectionOgAlt, sectionOgImage, sectionOgSize } from "@/lib/section-og";

// Link preview for the Projects page ("projects."), drawn at build time.
export const alt = sectionOgAlt("projects");
export const size = sectionOgSize;
export const contentType = "image/png";

export default async function Image() {
  return sectionOgImage("projects");
}
