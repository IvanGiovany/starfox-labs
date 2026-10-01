"use server";

import { checkNewSnippet } from "@/lib/admin/items/check-snippet";
import type { SaveItemInput, SaveItemResult } from "@/lib/admin/items/item-form";
import { saveItem } from "@/lib/admin/items/save-item";
import { trackDefinition, type TrackFields } from "@/lib/admin/items/tracks";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The Music form's Save draft / Publish / Update / Unpublish (see saveItem),
 * after the server has checked a newly added snippet file.
 */
export async function saveTrack(input: SaveItemInput<TrackFields>): Promise<SaveItemResult<TrackFields>> {
  await requireAdmin();
  const problem = await checkNewSnippet(await createSupabaseServerClient(), input.id, input.fields?.snippetPath);
  if (problem) return { ok: false, error: problem, fieldErrors: { snippetPath: problem } };
  return saveItem(trackDefinition, input);
}
