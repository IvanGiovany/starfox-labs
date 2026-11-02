import { SECTION_BANNERS } from "@/lib/section-banners";
import type { SectionKey } from "@/lib/section-meta";
import { SectionBanner } from "./section-banner";

// The top of every section page, chester-style: a huge lowercase serif title
// ending in a period ("writing."), then a short muted intro. The six section
// pages pass `banner` to show the title over their animated, full-width
// illustration (lib/section-banners.ts); every other page keeps the plain header.
export function SectionHeader({ title, banner, children }: { title: string; banner?: SectionKey; children: React.ReactNode }) {
  if (banner) {
    return (
      <SectionBanner section={banner} art={SECTION_BANNERS[banner]} title={title}>
        {children}
      </SectionBanner>
    );
  }

  return (
    <header className="pt-6 pb-10 sm:pt-10 sm:pb-12">
      <h1 className="font-serif text-[clamp(4rem,9vw,8rem)] leading-[0.9] font-normal tracking-[-0.03em]">
        {title}.
      </h1>
      <div className="mt-6 max-w-[65ch] text-base leading-relaxed text-fg-muted sm:mt-8 sm:text-lg">{children}</div>
    </header>
  );
}
