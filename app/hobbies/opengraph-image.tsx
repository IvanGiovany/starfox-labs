import { sectionOgAlt, sectionOgImage, sectionOgSize } from "@/lib/section-og";

// Link preview for the Hobbies page ("hobbies."), drawn at build time.
export const alt = sectionOgAlt("hobbies");
export const size = sectionOgSize;
export const contentType = "image/png";

export default async function Image() {
  return sectionOgImage("hobbies");
}
