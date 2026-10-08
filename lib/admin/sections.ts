// The admin's tabs: one per content type, then Comments (moderation).
export const adminSections = [
  { key: "writing", label: "Writing" },
  { key: "projects", label: "Projects" },
  { key: "reading", label: "Reading" },
  { key: "music", label: "Music" },
  { key: "games", label: "Games" },
  { key: "hobbies", label: "Hobbies" },
  { key: "comments", label: "Comments" },
] as const;

export type AdminSectionKey = (typeof adminSections)[number]["key"];
