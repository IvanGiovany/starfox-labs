import Link from "next/link";

type CardProps = {
  /** Small muted label in the top-left: "Section · Name". */
  label: string;
  /** Where the whole card links to. External links open in a new tab. */
  href?: string;
  className?: string;
  children: React.ReactNode;
};

// One tile in a chester-style card grid. The label sits top-left with a ↗
// top-right; the content is pushed to the bottom of the card. The grid sets
// size and placement through `className`. The whole card is the link, so
// it's an easy target on mobile.
export function Card({ label, href, className = "", children }: CardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3 text-xs text-fg-muted">
        <span className="truncate">{label}</span>
        {href && (
          <span
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          >
            ↗
          </span>
        )}
      </div>
      <div className="mt-auto flex min-h-0 flex-col pt-6">{children}</div>
    </>
  );

  const base = `group flex min-w-0 flex-col overflow-hidden rounded-xl bg-bg-raised p-4 text-fg no-underline sm:p-5 ${className}`;

  if (!href) return <div className={base}>{content}</div>;

  const interactive = `${base} transition-[box-shadow,background-color] duration-200 hover:bg-[color-mix(in_srgb,var(--bg-raised),var(--accent)_6%)] hover:text-fg hover:shadow-[0_10px_30px_-14px_var(--accent-glow)]`;

  return href.startsWith("http") ? (
    <a href={href} target="_blank" rel="noreferrer" className={interactive}>
      {content}
    </a>
  ) : (
    <Link href={href} className={interactive}>
      {content}
    </Link>
  );
}
