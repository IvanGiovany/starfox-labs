import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export type CardLink = { label: string; href: string };

type CardProps = {
  /** Small muted label in the top-left: "Section · Name". */
  label: string;
  /** Where the card links to. External links open in a new tab. */
  href?: string;
  /** Its place in the grid (0, 1, 2…): cards drop in one after another, 0.15 s apart. */
  index?: number;
  /** Milliseconds of the drop-in already played (a card replacing an identical one mid-animation). */
  playedMs?: number;
  /**
   * Smaller links shown under the label (a project's repo or article). With
   * these, the card can't be one big link (links can't sit inside links), so a
   * link covering the card sits underneath and these sit on top of it.
   */
  links?: CardLink[];
  /** The covering link's name for screen readers when `links` are used: the card's title. */
  linkLabel?: string;
  /** Lines right under the label (e.g. a game's status and details), above content pushed to the bottom. */
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
};

// One tile in a chester-style card grid. The label sits top-left; a card that
// links somewhere has an arrow in a small circle top-right, which lights up
// when the card is hovered or focused, while the card turns one step darker
// (lighter in dark mode). Content is pushed to the bottom of the card; images
// can be placed against the card itself (it's `relative`). The grid sets size
// and placement through `className`.
export function Card({ label, href, index = 0, playedMs = 0, links, linkLabel, meta, className = "", children }: CardProps) {
  const style = { "--card-index": index, ...(playedMs ? { "--card-offset": `${playedMs}ms` } : {}) } as CSSProperties;
  const base = `card-in group relative isolate flex min-w-0 flex-col overflow-hidden rounded-xl bg-bg-raised p-4 text-fg no-underline sm:p-5 ${className}`;
  const interactive = `${base} transition-colors hover:bg-bg-raised-hover focus-within:bg-bg-raised-hover`;

  const header = (
    <div className="flex items-start justify-between gap-3 text-xs text-fg-muted">
      <span className="truncate py-1.5">{label}</span>
      {href && <ArrowCircle />}
    </div>
  );
  const metaBlock = meta && <div className="-mt-0.5">{meta}</div>;
  const content = <div className="mt-auto flex min-h-0 flex-col pt-6">{children}</div>;

  if (!href) {
    return (
      <div className={base} style={style}>
        {header}
        {metaBlock}
        {content}
      </div>
    );
  }

  if (links?.length) {
    return (
      <div className={interactive} style={style}>
        <CardAnchor href={href} aria-label={linkLabel ?? label} className="absolute inset-0 -z-10 rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent" />
        <div className="pointer-events-none flex min-h-0 grow flex-col">
          {header}
          <div className="pointer-events-auto -mt-0.5 flex flex-wrap gap-x-3 text-xs">
            {links.map((link) => (
              <CardAnchor key={link.href} href={link.href} className="text-fg-muted underline decoration-dotted underline-offset-4 transition-colors hover:text-fg">
                {link.label}
              </CardAnchor>
            ))}
          </div>
          {metaBlock}
          {content}
        </div>
      </div>
    );
  }

  return (
    <CardAnchor href={href} className={interactive} style={style}>
      {header}
      {metaBlock}
      {content}
    </CardAnchor>
  );
}

/** chester's arrow: a small circle that turns into a raised key when the card is hovered or focused. */
function ArrowCircle() {
  return (
    <span
      aria-hidden="true"
      className="-mt-1.5 -mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors group-focus-within:bg-bg group-focus-within:text-fg group-focus-within:shadow-(--shadow-skeuo) group-hover:bg-bg group-hover:text-fg group-hover:shadow-(--shadow-skeuo) sm:-mr-2.5"
    >
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 11 11 5M6 5h5v5" />
      </svg>
    </span>
  );
}

/** A link inside a card: our own pages through next/link, other sites in a new tab. */
function CardAnchor({ href, children, ...rest }: { href: string; children?: ReactNode; className?: string; style?: CSSProperties; "aria-label"?: string }) {
  return href.startsWith("http") ? (
    <a href={href} target="_blank" rel="noreferrer" {...rest}>
      {children}
    </a>
  ) : (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}
