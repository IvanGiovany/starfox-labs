"use client";

import Image from "next/image";
import { useState } from "react";

// A "click to load" YouTube player. Until someone presses play, the page only
// shows YouTube's thumbnail image: no YouTube scripts, no cookies, and a much
// lighter page. Pressing play swaps in the real player from
// youtube-nocookie.com (YouTube's privacy-enhanced mode) and starts it.
export function YouTubeEmbed({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-bg-raised">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 size-full cursor-pointer"
        >
          <Image
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt=""
            fill
            sizes="(min-width: 1024px) 800px, 100vw"
            className="object-cover transition-[filter] duration-300 group-hover:brightness-90"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-accent text-bg shadow-[0_0_40px_var(--accent-glow)] transition-transform duration-200 group-hover:scale-105 group-focus-visible:scale-105">
              <svg viewBox="0 0 24 24" className="ml-1 size-6" fill="currentColor" aria-hidden="true">
                <path d="M8 5.5v13l10.5-6.5z" />
              </svg>
            </span>
          </span>
          <span className="sr-only">Play video: {title}</span>
        </button>
      )}
    </div>
  );
}
