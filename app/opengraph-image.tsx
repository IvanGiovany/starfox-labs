import { ogImage, ogSize } from "@/lib/og";
import { site } from "@/lib/site";

// The default link preview for every page that doesn't have its own
// (home, writing, and later the other sections).
export const alt = `${site.name}: writing, projects and music by ${site.author}`;
export const size = ogSize;
export const contentType = "image/png";

export default async function Image() {
  return ogImage({
    title: site.name,
    subtitle: "Writing about software, projects, and music as Spektral.",
  });
}
