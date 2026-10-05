import { PixelArt } from "@/components/pixel-art";

// The footer on every page, like chester.how's ("Planted by Chester" under its
// leaf): Ivan's Shinx centred above one short line, nothing else (the social
// links are in the header). Hovering the art or the line wakes Shinx up.
export function SiteFooter() {
  return (
    <footer className="flex justify-center pt-36 pb-20">
      <div className="group/art flex flex-col items-center gap-2">
        <PixelArt />
        <p className="text-sm tracking-tight text-fg-muted">Made in the lab by Gvan</p>
      </div>
    </footer>
  );
}
