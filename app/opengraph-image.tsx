import { ogImage, ogSize } from "@/lib/og";
import { site } from "@/lib/site";

// The default link preview for every page that doesn't have its own
// (home, and /privacy, which re-exports it: pages that set their own
// `openGraph` metadata, as /privacy does, don't inherit this file).
export const alt = `${site.name}: writing, projects and music by ${site.author}`;
export const size = ogSize;
export const contentType = "image/png";

export default async function Image() {
  return ogImage({
    title: site.name,
    subtitle: "Writing about software, projects, and music as Spektral.",
  });
}
