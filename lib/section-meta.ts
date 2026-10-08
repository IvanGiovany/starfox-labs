// Each section page's name and one-line description, shared by its metadata
// (title, description, link-preview text) and its link-preview image
// (app/<section>/opengraph-image.tsx), so the two never drift apart.

export const SECTION_META = {
  projects: { title: "Projects", description: "Things I've built, mostly for fun." },
  writing: { title: "Writing", description: "Articles about software, and a few other things." },
  reading: { title: "Reading", description: "What I'm reading, what I've finished, and what's next." },
  music: { title: "Music", description: "Songs I've made, each with a short preview and a few words about it." },
  games: { title: "Games", description: "Games I'm playing and have played, each with a review." },
  hobbies: { title: "Hobbies", description: "The things I do for fun away from the keyboard, and what I'm learning." },
} as const;

export type SectionKey = keyof typeof SECTION_META;
