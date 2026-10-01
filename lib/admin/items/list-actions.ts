"use server";

import { refresh, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { explainItemError } from "./item-errors";
import { ITEM_SECTIONS, type ItemSection, type ItemSectionKey } from "./sections";

// One-tap actions from the item lists: publish or unpublish, delete, and save
// a new order. Server action arguments come from the browser, so the section
// key is checked against the real sections before it picks a table.

export type ListActionResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sectionFor(key: ItemSectionKey): ItemSection {
  const section = (ITEM_SECTIONS as Record<string, ItemSection>)[key];
  if (!section) throw new Error(`Unknown section: ${String(key)}`);
  return section;
}

/** Public pages that show items: the section page, the home grid, and articles' "about this" panels. */
function refreshPages(section: ItemSection) {
  updateTag(section.cacheTag);
  updateTag("home");
  updateTag("posts");
  refresh(); // and this list re-renders with the change
}

export async function setItemStatus(key: ItemSectionKey, id: string, status: "draft" | "published"): Promise<ListActionResult> {
  await requireAdmin();
  const section = sectionFor(key);
  if (!UUID.test(id) || (status !== "draft" && status !== "published")) return { ok: false, error: "That request didn't make sense. Reload and try again." };

  const supabase = await createSupabaseServerClient();
  // supabase-js can't type a table chosen at runtime; see save-item.ts.
  const { error } = await supabase.from(section.table as "projects").update({ status }).eq("id", id);
  if (error) return { ok: false, error: explainItemError(section.table, error).message };

  refreshPages(section);
  return { ok: true };
}

export async function deleteItem(key: ItemSectionKey, id: string): Promise<ListActionResult> {
  await requireAdmin();
  const section = sectionFor(key);
  if (!UUID.test(id)) return { ok: false, error: "That request didn't make sense. Reload and try again." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from(section.table as "projects").delete().eq("id", id);
  if (error) return { ok: false, error: explainItemError(section.table, error).message };

  // The image stays in Storage for now (see "Unused media" in CLAUDE.md).
  refreshPages(section);
  return { ok: true };
}

/** Saves a section's drag-and-drop order: `ids` from top to bottom. */
export async function reorderItems(key: ItemSectionKey, ids: string[]): Promise<ListActionResult> {
  await requireAdmin();
  const section = sectionFor(key);
  if (section.order !== "manual") return { ok: false, error: `${section.label} is sorted automatically.` };
  if (!Array.isArray(ids) || ids.length > 1000 || !ids.every((id) => typeof id === "string" && UUID.test(id))) {
    return { ok: false, error: "That request didn't make sense. Reload and try again." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reorder_items", { section: section.table, ids });
  if (error) return { ok: false, error: "The new order couldn't be saved. Reload and try again." };

  refreshPages(section);
  return { ok: true };
}
