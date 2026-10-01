import { ITEM_SECTIONS, type ItemSectionKey } from "./sections";

// "Write the article" from an item form opens /admin/writing/new?for=projects:<id>.
// The new article's first save then links it back to that item. This file
// reads and checks that request; it's untrusted input (a URL, then a server
// action argument), so only a real section and a real id get through.

export type LinkRequest = { section: ItemSectionKey; itemId: string };

/** The item a new article is being written for, as the editor shows it. */
export type LinkTarget = LinkRequest & {
  label: string;
  itemTitle: string;
  /** The item already links an article (then this one won't be linked). */
  hasArticle: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "projects:<uuid>" (from the URL) or { section, itemId } (from the editor). */
export function parseLinkRequest(value: unknown): LinkRequest | null {
  let section: unknown;
  let itemId: unknown;
  if (typeof value === "string") [section, itemId] = value.split(":");
  else if (value && typeof value === "object") ({ section, itemId } = value as Record<string, unknown>);
  if (typeof section !== "string" || !Object.hasOwn(ITEM_SECTIONS, section)) return null;
  if (typeof itemId !== "string" || !UUID.test(itemId)) return null;
  return { section: section as ItemSectionKey, itemId };
}
