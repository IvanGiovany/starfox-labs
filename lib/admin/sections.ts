// The admin's tabs, one per content type. `ready` flips on as each section's
// form is built (Writing in step 2.3, the rest in step 2.4).
export const adminSections = [
  { key: "writing", label: "Writing", ready: true },
  { key: "projects", label: "Projects", ready: true },
  { key: "reading", label: "Reading", ready: false },
  { key: "music", label: "Music", ready: false },
  { key: "games", label: "Games", ready: false },
  { key: "hobbies", label: "Hobbies", ready: false },
] as const;

export type AdminSectionKey = (typeof adminSections)[number]["key"];
