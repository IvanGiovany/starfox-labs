import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { isSnippetPath, storedSnippetProblem } from "../snippet-rules";

// Before a song is saved with a new snippet, the server asks Storage about the
// file: the browser's checks are for speed, this one counts. Only a changed
// snippet is checked, so saving other changes costs nothing extra (and the
// sample songs, whose snippet files don't exist, can still be edited).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The problem with the song's snippet as a sentence, or null if it's fine or
 * unchanged. Takes the caller's Supabase client (the admin's session).
 */
export async function checkNewSnippet(
  supabase: SupabaseClient<Database>,
  trackId: string | null,
  snippetPath: unknown,
): Promise<string | null> {
  const path = typeof snippetPath === "string" ? snippetPath.trim() : "";
  // No snippet, or not one of our paths: the form's own validation reports that.
  if (!isSnippetPath(path)) return null;

  if (trackId !== null && UUID.test(trackId)) {
    const { data } = await supabase.from("tracks").select("snippet_path").eq("id", trackId).maybeSingle();
    if (data?.snippet_path === path) return null;
  }

  const { data, error } = await supabase.storage.from("media").info(path);
  if (error) {
    // A missing file arrives as HTTP 400 with Storage's own code 404 ("NoSuchKey").
    const { statusCode, code } = error as { statusCode?: string; code?: string };
    if (statusCode === "404" || code === "NoSuchKey") return storedSnippetProblem(path, null);
    return "Couldn't check the snippet file just now. Try saving again.";
  }
  return storedSnippetProblem(path, data);
}
