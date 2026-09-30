import { ogImage, ogSize } from "@/lib/og";
import { site } from "@/lib/site";

// Link preview for the Writing page, in the section-page style ("writing.").
export const alt = `Writing on ${site.name}`;
export const size = ogSize;
export const contentType = "image/png";

export default async function Image() {
  return ogImage({
    title: "writing.",
    subtitle: "Articles about software, and a few other things.",
  });
}
