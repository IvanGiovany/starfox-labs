// The admin's tabs, one per content type. `ready` flips on as each section's
// form is built (Writing in step 2.3, the rest in step 2.4).
export const adminSections = [
  { key: "writing", label: "Writing", ready: true },
  { key: "projects", label: "Projects", ready: true },
  { key: "reading", label: "Reading", ready: true },
  { key: "music", label: "Music", ready: true },
  { key: "games", label: "Games", ready: true },
  { key: "hobbies", label: "Hobbies", ready: false },
] as const;

export type AdminSectionKey = (typeof adminSections)[number]["key"];
