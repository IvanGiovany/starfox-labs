import Image from "next/image";
import { Card } from "@/components/card";
import { spanClass } from "@/components/card-grid";
import type { Span } from "@/lib/grid";
import type { Video } from "@/lib/youtube-feed";

// A YouTube video on the home grid, like a hobby photo card: the thumbnail
// fills the card, the title sits bottom-left in white, and a small play
// button bottom-right. On hover or focus the picture slides down 48 px to show
// the label row, and the title gets a dark backing (chester's photo cards).
// Opens the video on YouTube in a new tab. The thumbnail goes through
// next/image, so YouTube sees Vercel's server fetch it, not the visitor.
export function VideoCard({ video, span, index }: { video: Video; span: Span; index: number }) {
  const sizes = span === 2 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw";
  return (
    <Card label="YouTube · Video" href={video.url} index={index} className={spanClass(span)}>
      {/* Positioned, so it covers the label row until it slides down. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl transition-[translate] motion-safe:group-focus-within:translate-y-12 motion-safe:group-hover:translate-y-12">
        <Image src={video.thumbnail} alt="" fill sizes={sizes} className="object-cover" />
      </div>
      <div className="relative z-10 -mx-2 -mb-2 flex items-end justify-between gap-3 sm:-mx-3 sm:-mb-3">
        <p className="min-w-0">
          <span className="line-clamp-2 rounded-lg bg-black/40 px-2 py-1 text-sm text-white transition-colors group-focus-within:bg-black/70 group-hover:bg-black/70">
            {video.title}
          </span>
        </p>
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-bg shadow-[0_0_24px_var(--accent-glow)]"
        >
          <svg viewBox="0 0 24 24" className="ml-0.5 size-4" fill="currentColor">
            <path d="M8 5.5v13l10.5-6.5z" />
          </svg>
        </span>
      </div>
    </Card>
  );
}
