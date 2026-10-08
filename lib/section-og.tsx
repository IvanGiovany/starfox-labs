import { ogImage, ogSize } from "./og";
import { SECTION_META, type SectionKey } from "./section-meta";
import { site } from "./site";

// A section page's link preview, in the section-page style ("music.") with its
// one-line description. No counts (Ivan, 2026-10-08): platforms cache previews
// for days, so a number in the image would soon be wrong.

export const sectionOgSize = ogSize;
export const sectionOgAlt = (section: SectionKey) => `${SECTION_META[section].title} on ${site.name}`;

export function sectionOgImage(section: SectionKey) {
  return ogImage({ title: `${section}.`, subtitle: SECTION_META[section].description });
}
