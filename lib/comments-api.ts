// Reading and writing comments from the browser, as the visitor (publishable
// key + their session cookie). RLS and the triggers decide what's allowed;
// errors come back as Postgres codes for commentError() to explain.

import { COMMENT_COLUMNS, COMMENTS_PAGE, type Comment } from "./comments";
import { createSupabaseBrowserClient } from "./supabase/browser";

type DbError = { code?: string; message?: string };
export type Result<T> = { ok: true; value: T } | { ok: false; error: DbError | null };

const db = () => createSupabaseBrowserClient();

/**
 * One page of top-level comments, newest first, with all their replies.
 * `after` is the last top-level comment already shown. Ties on the time are
 * broken by id, so paging never skips or repeats one.
 */
export async function fetchCommentPage(
  postId: string,
  after?: Comment,
): Promise<Result<{ topLevel: Comment[]; replies: Comment[]; hasMore: boolean }>> {
  let query = db().from("comments").select(COMMENT_COLUMNS).eq("post_id", postId).is("parent_id", null);
  if (after) {
    // Values are quoted: timestamps contain ":" and ".", which PostgREST's
    // filter syntax would otherwise read as separators.
    query = query.or(`created_at.lt."${after.created_at}",and(created_at.eq."${after.created_at}",id.lt.${after.id})`);
  }
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(COMMENTS_PAGE + 1);
  if (error || !data) return { ok: false, error };

  const page = (data as Comment[]).slice(0, COMMENTS_PAGE);
  let replies: Comment[] = [];
  if (page.length) {
    const result = await db()
      .from("comments")
      .select(COMMENT_COLUMNS)
      .in("parent_id", page.map((c) => c.id))
      .order("created_at")
      .order("id");
    if (result.error || !result.data) return { ok: false, error: result.error };
    replies = result.data as Comment[];
  }
  return { ok: true, value: { topLevel: page, replies, hasMore: data.length > COMMENTS_PAGE } };
}

/** How many comments an article has (placeholders of deleted ones don't count). */
export async function fetchCommentCount(postId: string): Promise<number | null> {
  const { count, error } = await db()
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId)
    .is("deleted_at", null);
  return error ? null : count;
}

export async function postComment(postId: string, body: string, parentId: string | null): Promise<Result<Comment>> {
  const { data, error } = await db()
    .from("comments")
    .insert({ post_id: postId, parent_id: parentId, body })
    .select(COMMENT_COLUMNS)
    .single();
  return error || !data ? { ok: false, error } : { ok: true, value: data as Comment };
}

/** Saves new text; no row back means it's no longer the visitor's to edit. */
export async function editComment(id: string, body: string): Promise<Result<Comment>> {
  const { data, error } = await db().from("comments").update({ body }).eq("id", id).select(COMMENT_COLUMNS).maybeSingle();
  if (error) return { ok: false, error };
  if (!data) return { ok: false, error: { code: "42501" } };
  return { ok: true, value: data as Comment };
}

/** "removed", "placeholder" (it has replies) or "gone" (already deleted). */
export async function deleteComment(id: string): Promise<Result<string>> {
  const { data, error } = await db().rpc("delete_comment", { comment_id: id });
  return error || !data ? { ok: false, error } : { ok: true, value: data };
}
