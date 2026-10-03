"use server";

import { refresh, updateTag } from "next/cache";
import { gameDefinition, withPlayStatus, type GameFields } from "@/lib/admin/items/games";
import { explainItemError } from "@/lib/admin/items/item-errors";
import type { SaveItemInput } from "@/lib/admin/items/item-form";
import type { ListActionResult } from "@/lib/admin/items/list-actions";
import { ITEM_SECTIONS } from "@/lib/admin/items/sections";
import { saveItem } from "@/lib/admin/items/save-item";
import { requireAdmin } from "@/lib/auth";
import { isPlausibleToday } from "@/lib/format";
import { isPlayStatus } from "@/lib/games";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const section = ITEM_SECTIONS.games;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The list's one-tap steps ("Finished", "Dropped"). Finishing fills the date
 * the same way the form does, never overwriting one. `today` is the admin's
 * local date from the browser; it must plausibly be today somewhere.
 */
export async function setPlayStatus(id: string, status: string, today: string): Promise<ListActionResult> {
  await requireAdmin();
  if (!UUID.test(id) || !isPlayStatus(status) || !isPlausibleToday(today)) {
    return { ok: false, error: "That request didn't make sense. Reload and try again." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: game, error: readError } = await supabase.from("games").select("play_status, finished_on").eq("id", id).maybeSingle();
  if (readError) return { ok: false, error: explainItemError("games", readError).message };
  if (!game) return { ok: false, error: "This game no longer exists. Reload the list." };

  const next = withPlayStatus({ playStatus: isPlayStatus(game.play_status) ? game.play_status : "playing", finishedOn: game.finished_on ?? "" }, status, today);
  const { error } = await supabase.from("games").update({ play_status: next.playStatus, finished_on: next.finishedOn || null }).eq("id", id);
  if (error) return { ok: false, error: explainItemError("games", error).message };

  updateTag(section.cacheTag);
  updateTag("home");
  updateTag("posts");
  refresh();
  return { ok: true };
}

/** The Games form's Save draft / Publish / Update / Unpublish (see saveItem). */
export async function saveGame(input: SaveItemInput<GameFields>) {
  return saveItem(gameDefinition, input);
}
