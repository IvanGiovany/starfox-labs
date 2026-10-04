"use server";

import { hobbyDefinition, matchCategory, type HobbyFields } from "@/lib/admin/items/hobbies";
import { explainItemError } from "@/lib/admin/items/item-errors";
import type { SaveItemInput, SaveItemResult } from "@/lib/admin/items/item-form";
import { saveItem } from "@/lib/admin/items/save-item";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The Hobbies form's Save draft / Publish / Update / Unpublish (see saveItem).
 * A category that matches an existing one ignoring case is stored with that
 * spelling ("coffee" → "Coffee"), so cards don't split into two groups.
 */
export async function saveHobby(input: SaveItemInput<HobbyFields>): Promise<SaveItemResult<HobbyFields>> {
  await requireAdmin();
  const category = input.fields?.category;
  if (typeof category === "string" && category.trim()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("hobby_items").select("category").not("category", "is", null);
    if (error) return { ok: false, error: explainItemError("hobby_items", error).message };
    input = { ...input, fields: { ...input.fields, category: matchCategory(category, data.flatMap((h) => (h.category ? [h.category] : []))) } };
  }
  return saveItem(hobbyDefinition, input);
}
