// Site-wide settings in one place, so links and names aren't scattered
// through components. Leave a link empty to hide it everywhere.
export const site = {
  name: "Starfox Labs",
  author: "Ivan",
  // Canonical address, used for link previews and canonical URLs.
  // NEXT_PUBLIC_SITE_URL can override it (e.g. for a staging deployment).
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://starfoxlabs.org",
  links: {
    github: "https://github.com/IvanGiovany",
    youtube: "https://www.youtube.com/@gvan1",
  },

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

  // Home status cards. Temporary: in the Sections phase these come from the
  // database ("Now producing" = a release in progress, "Learning" = a hobby item).
  now: {
    // TODO(Ivan): real track name and a line about it.
    producing: {
      artist: "Spektral",
      title: "Untitled track",
      note: "Placeholder: a line about what you're working on.",
      href: "",
    },
    // TODO(Ivan): what you're learning right now.
    learning: {
      topic: "Next.js 16",
      items: ["Cache Components", "Row Level Security", "Placeholder"],
    },
  },
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
