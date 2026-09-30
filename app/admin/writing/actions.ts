"use server";

import { refresh, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Quick actions from the article list. Each one checks the admin on the
// server (never trust the button), and RLS checks again in the database.

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Turns database errors into sentences; unknown errors get a generic message. */
function explain(error: { code?: string; message?: string }): string {
  const message = error.message ?? "";
  if (message.includes("published_posts_have_body")) {
    return "This article has no text yet. Add some before publishing.";
  }
  if (message.includes("published_tracks_have_article_and_snippet")) {
    return "A published song needs this article. Unpublish the song first, or link it to another article.";
  }
  if (message.includes("published_games_have_review")) {
    return "A published game uses this as its review. Unpublish the game first, or link it to another review.";
  }
  return "Something went wrong saving that. Try again.";
}

/** Publish or unpublish without opening the editor. */
export async function setPostStatus(id: string, status: "draft" | "published"): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("posts").update({ status }).eq("id", id);
  if (error) return { ok: false, error: explain(error) };

  updateTag("posts"); // public pages show the change on the very next request
  refresh(); // and this list re-renders with the new status
  return { ok: true };
}

export async function deletePost(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) return { ok: false, error: explain(error) };

  updateTag("posts");
  refresh();
  return { ok: true };
}
