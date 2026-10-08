// Site-wide settings in one place, so links and names aren't scattered
// through components. Leave a link empty to hide it everywhere.

/** Ivan's artist name for his music. */
const artist = "Spektral";

export const site = {
  name: "Starfox Labs",
  /** The site in one line: the default description, and the structured data's. */
  description: "Gvan's notes on software, projects, and music as Spektral.",
  author: "Ivan",
  /** The name Ivan goes by on the site (the home tab, the footer, his profile, /privacy). */
  handle: "Gvan",
  artist,
  // Canonical address, used for link previews and canonical URLs.
  // NEXT_PUBLIC_SITE_URL can override it (e.g. for a staging deployment).
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://starfoxlabs.org",
  links: {
    github: "https://github.com/IvanGiovany",
    youtube: "https://www.youtube.com/@gvan1",
  },
  // The channel behind @gvan1, for its public video feed (home's video cards).
  // Empty: home shows only the channel card.
  youtubeChannelId: "UCi1vz5yZr_iJe3aW9xX4OmA",

  // The header tab bar. "Gvan" is the home link, like "Chester" on chester.how.
  nav: [
    { label: "Gvan", href: "/" },
    { label: "Projects", href: "/projects" },
    { label: "Writing", href: "/writing" },
    { label: "Reading", href: "/reading" },
    { label: "Music", href: "/music" },
    { label: "Games", href: "/games" },
    { label: "Hobbies", href: "/hobbies" },
  ],
  // The home status cards come from the database: "Now producing" is a track
  // marked in progress, "Reading" the books being read, "Learning" the hobby
  // items in the Learning category (see lib/home.ts).
} as const;

/**
 * Link-preview defaults to spread into every page's `openGraph`. Next.js
 * replaces a parent's openGraph object instead of merging it, so a page that
 * sets its own would otherwise lose the site name.
 */
export const openGraphDefaults = {
  siteName: site.name,
  locale: "en_AU",
  type: "website",
} as const;

/** Who and what the site is, for structured data (lib/structured-data.ts). */
export const siteIdentity = {
  url: site.url,
  name: site.name,
  description: site.description,
  handle: site.handle,
  sameAs: Object.values(site.links).filter(Boolean),
};
