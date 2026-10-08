"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Moderation: the admin deletes any comment. Checked here (never trust the
// button) and again by delete_comment() in the database, which also decides
// whether a comment with replies becomes a placeholder. Comments aren't
// cached (they load in the browser), so there are no cache tags to update.

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function deleteCommentAsAdmin(id: string): Promise<ActionResult> {
  await requireAdmin("/admin/comments");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("delete_comment", { comment_id: id });
  if (error) return { ok: false, error: "The comment couldn't be deleted. Try again." };
  refresh(); // the list re-renders without it
  return { ok: true };
}
