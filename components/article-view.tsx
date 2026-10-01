import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/badge";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { formatDate } from "@/lib/format";
import { youtubeId } from "@/lib/youtube";

// An article's title, date line, tags, cover, video and body, as readers see
// it. Shared by the article page (server) and the editor's live preview
// (browser), so the preview can't drift from the real thing. No server-only
// imports here; the body arrives already rendered.

type ArticleViewProps = {
  title: string;
  /** null for a draft that hasn't been published yet. */
  publishedAt: string | null;
  minutes: number;
  tags: string[];
  coverImageUrl: string | null;
  youtubeUrl: string | null;
  body: ReactNode;
};

export function ArticleView({ title, publishedAt, minutes, tags, coverImageUrl, youtubeUrl, body }: ArticleViewProps) {
  const videoId = youtubeUrl ? youtubeId(youtubeUrl) : null;

  return (
    <>
      <header className="reveal mt-8 sm:mt-10">
        <h1 className="font-serif text-[clamp(2.4rem,5.5vw,3.75rem)] leading-[1.05] font-semibold tracking-[-0.02em] text-balance">
          {title}
        </h1>
        <p className="mt-5 font-serif text-lg text-fg-muted italic">
          {publishedAt ? <time dateTime={publishedAt}>{formatDate(publishedAt)}</time> : "Draft"}
          <span aria-hidden="true"> · </span>
          {minutes} min read
        </p>
        {tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
            {tags.map((tag) => (
              <li key={tag}>
                <Link href={`/writing?tag=${encodeURIComponent(tag)}`} className="no-underline hover:opacity-80">
                  <Badge>{tag}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <hr className="mt-8 w-24 border-rule" />
      </header>

      {/* Cover and video are slightly wider than the text on large screens. */}
      {coverImageUrl && (
        <div
          className="reveal relative mt-10 aspect-[16/9] overflow-hidden rounded-xl bg-bg-raised lg:-mx-16"
          style={{ "--reveal-delay": "60ms" } as React.CSSProperties}
        >
          <Image src={coverImageUrl} alt="" fill priority sizes="(min-width: 1024px) 800px, 100vw" className="object-cover" />
        </div>
      )}

      {videoId && (
        <div className="reveal mt-10 lg:-mx-16" style={{ "--reveal-delay": "60ms" } as React.CSSProperties}>
          <YouTubeEmbed id={videoId} title={title} />
        </div>
      )}

      <div className="reveal prose mt-10 max-w-none" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
        {body}
      </div>
    </>
  );
}
