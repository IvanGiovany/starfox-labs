// Comments: the rules and helpers the comments section uses in the browser
// (and the tests). The database has the final say (migration
// 20261008100000: who may comment, one level of replies, 1–2000 characters,
// the rate limit); these mirror it so people get a clear message first.

import { formatDate } from "./format";

export const COMMENT_MAX = 2000;
/** The character count shows from here on. */
export const COMMENT_COUNT_FROM = 1800;
/** Top-level comments per page ("Show more" loads the next lot). */
export const COMMENTS_PAGE = 30;

export type CommentAuthor = { username: string; display_name: string; avatar_path: string | null };

export type Comment = {
  id: string;
  parent_id: string | null;
  user_id: string | null;
  body: string;
  by_admin: boolean;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  author: CommentAuthor | null;
};

/** What the comments section selects, author included (profiles are public). */
export const COMMENT_COLUMNS =
  "id, parent_id, user_id, body, by_admin, created_at, edited_at, deleted_at, author:profiles(username, display_name, avatar_path)";

/** A top-level comment and its replies (oldest first, like a conversation). */
export type Thread = { comment: Comment; replies: Comment[] };

/**
 * Tidies what was typed: Windows line breaks become plain ones, spaces and
 * blank lines at the start and end go, and runs of blank lines shrink to one.
 */
export function normaliseCommentBody(raw: string): string {
  return raw.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** What's wrong with a comment (already normalised), or null. */
export function commentProblem(body: string): string | null {
  if (body.length === 0) return "Write something first.";
  if (body.length > COMMENT_MAX) return `Keep it to ${COMMENT_MAX.toLocaleString("en")} characters.`;
  return null;
}

/**
 * Threads from one page of top-level comments (newest first, as loaded) and
 * the replies to them (any order). Replies to comments not on the page are
 * left out.
 */
export function buildThreads(topLevel: Comment[], replies: Comment[]): Thread[] {
  const byParent = new Map<string, Comment[]>();
  for (const reply of replies) {
    if (!reply.parent_id) continue;
    const list = byParent.get(reply.parent_id) ?? [];
    list.push(reply);
    byParent.set(reply.parent_id, list);
  }
  return topLevel.map((comment) => ({
    comment,
    replies: (byParent.get(comment.id) ?? []).sort(oldestFirst),
  }));
}

function oldestFirst(a: Comment, b: Comment): number {
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Comments counted in the heading: placeholders of deleted ones don't count. */
export function countVisible(threads: Thread[]): number {
  let n = 0;
  for (const { comment, replies } of threads) {
    if (!comment.deleted_at) n++;
    n += replies.length;
  }
  return n;
}

/**
 * Applies delete_comment()'s answer to the threads: "placeholder" keeps the
 * comment as "This comment was deleted."; "removed" or "gone" takes it out,
 * and a placeholder left without replies goes too (as in the database).
 */
export function afterDelete(threads: Thread[], id: string, outcome: string): Thread[] {
  if (outcome === "placeholder") {
    return threads.map((t) =>
      t.comment.id === id
        ? { ...t, comment: { ...t.comment, body: "", user_id: null, author: null, edited_at: null, deleted_at: new Date().toISOString() } }
        : t,
    );
  }
  return threads
    .filter((t) => t.comment.id !== id)
    .map((t) => (t.replies.some((r) => r.id === id) ? { ...t, replies: t.replies.filter((r) => r.id !== id) } : t))
    .filter((t) => !(t.comment.deleted_at && t.replies.length === 0));
}

/** Who wrote it, for display: the author, "deleted user", or nobody (a placeholder). */
export function authorState(comment: Comment): "author" | "deleted-user" | "placeholder" {
  if (comment.deleted_at) return "placeholder";
  return comment.author ? "author" : "deleted-user";
}

/** The text a reply to a reply starts with, so it's clear who it answers. */
export function mentionFor(comment: Comment): string {
  return comment.parent_id && comment.author ? `@${comment.author.username} ` : "";
}

/**
 * "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", then the
 * date ("Oct 8, 2026"). Comments render only in the browser, so the clock is safe.
 */
export function relativeTime(iso: string, now = new Date()): string {
  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(iso);
}

/**
 * Turns the database's refusal into a message. Postgres codes: PT429 the rate
 * limit (its message is written for readers), 23514 a check (the reply rules'
 * messages are too; a raw constraint name isn't), 42501 not allowed (signed
 * out meanwhile, or the article was unpublished).
 */
export function commentError(error: { code?: string; message?: string } | null, action: "post" | "save" | "delete"): string {
  const fallback = {
    post: "Your comment couldn't be posted. Check your connection and try again.",
    save: "Your changes couldn't be saved. Check your connection and try again.",
    delete: "The comment couldn't be deleted. Check your connection and try again.",
  }[action];
  if (!error) return fallback;
  if (error.code === "PT429" && error.message) return error.message;
  if (error.code === "23514") {
    if (error.message?.includes("comments_body_length")) return `Comments are 1 to ${COMMENT_MAX.toLocaleString("en")} characters.`;
    if (error.message && !error.message.includes("constraint")) return error.message;
  }
  if (error.code === "42501") return "You're signed out, or comments are closed here. Reload the page and try again.";
  return fallback;
}
