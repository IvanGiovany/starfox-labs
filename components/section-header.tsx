// The top of every section page, chester-style: a huge lowercase serif title
// ending in a period ("writing."), then a short muted intro.
export function SectionHeader({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <header className="pt-6 pb-10 sm:pt-10 sm:pb-12">
      <h1 className="font-serif text-[clamp(4rem,9vw,8rem)] leading-[0.9] font-normal tracking-[-0.03em]">
        {title}.
      </h1>
      <div className="mt-6 max-w-[65ch] text-base leading-relaxed text-fg-muted sm:mt-8 sm:text-lg">{children}</div>
    </header>
  );
}
