// The admin's tabs, one per content type.
export const adminSections = [
  { key: "writing", label: "Writing" },
  { key: "projects", label: "Projects" },
  { key: "reading", label: "Reading" },
  { key: "music", label: "Music" },
  { key: "games", label: "Games" },
  { key: "hobbies", label: "Hobbies" },
] as const;

export type AdminSectionKey = (typeof adminSections)[number]["key"];
