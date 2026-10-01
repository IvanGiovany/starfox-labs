import type { MediaFolder } from "@/lib/media";
import type { ImageUse } from "../image-rules";
import type { AdminSectionKey } from "../sections";

// The five item sections and what differs between them at the shared level.
// Each section's own fields and rules live in its own file (projects.ts, …).

export type ItemTable = "projects" | "books" | "tracks" | "games" | "hobby_items";
export type ItemSectionKey = Exclude<AdminSectionKey, "writing">;

export type ItemSection = {
  key: ItemSectionKey;
  /** Database table. */
  table: ItemTable;
  /** Storage folder for its images (and audio, for music). */
  folder: MediaFolder;
  label: string;
  /** One item, in sentences: "Save the project first." */
  singular: string;
  /** Book and song covers are small upright objects; screenshots and photos fill whole cards. */
  imageUse: ImageUse;
  /** "manual": drag to reorder. "automatic": the section page sorts by status and dates (Reading). */
  order: "manual" | "automatic";
  /** Cache tag for the public section page (Phase 3). Saving also refreshes "home". */
  cacheTag: string;
};

export const ITEM_SECTIONS = {
  projects: { key: "projects", table: "projects", folder: "projects", label: "Projects", singular: "project", imageUse: "body", order: "manual", cacheTag: "projects" },
  reading: { key: "reading", table: "books", folder: "books", label: "Reading", singular: "book", imageUse: "cover", order: "automatic", cacheTag: "books" },
  music: { key: "music", table: "tracks", folder: "music", label: "Music", singular: "song", imageUse: "cover", order: "manual", cacheTag: "tracks" },
  games: { key: "games", table: "games", folder: "games", label: "Games", singular: "game", imageUse: "body", order: "manual", cacheTag: "games" },
  hobbies: { key: "hobbies", table: "hobby_items", folder: "hobbies", label: "Hobbies", singular: "hobby item", imageUse: "body", order: "manual", cacheTag: "hobby_items" },
} as const satisfies Record<ItemSectionKey, ItemSection>;

/** Which section a table belongs to (database errors name the table). */
export function sectionOfTable(table: ItemTable): ItemSection {
  return Object.values(ITEM_SECTIONS).find((s) => s.table === table)!;
}
