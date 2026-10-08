"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/badge";
import { CommentForm } from "@/components/comment-form";
import {
  afterDelete,
  authorState,
  buildThreads,
  commentError,
  mentionFor,
  relativeTime,
  type Comment,
  type Thread,
} from "@/lib/comments";
import { deleteComment, editComment, fetchCommentCount, fetchCommentPage, postComment } from "@/lib/comments-api";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// The comments under an article. The article page is static, so everything
// here happens in the browser: the comments load when the section comes near
// the screen (or straight away for a #comment-… link), and the session decides
// whether there's a box to write in. Newest first; replies under their
// comment, oldest first; one level of replies (replying to a reply answers the
// comment above, starting with @username). What anyone may do is decided by
// the database (RLS + triggers); the buttons only follow it.

type Viewer = { id: string; name: string; username: string; avatarPath: string | null };
type Load = "idle" | "loading" | "ready" | "error";
/** The open reply box: which thread, and which comment it answers (its key). */
type ReplyTarget = { threadId: string; toId: string; mention: string };

/** Starts loading this far before the section scrolls into view. */
const LOAD_MARGIN = "800px 0px";

export function Comments({ postId, slug }: { postId: string; slug: string }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Viewer | null | undefined>(undefined); // undefined = not known yet
  const [load, setLoad] = useState<Load>("idle");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  // Who's reading: follows signing in and out (the header's menu signs out
  // through the same browser client). Supabase advises against waiting on it
  // inside this callback, so the profile is fetched just after.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let current: string | null | undefined;
    let cancelled = false;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      if (id === current) return;
      current = id;
      if (!id) return setViewer(null);
      setTimeout(async () => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, display_name, avatar_path")
          .eq("id", id)
          .maybeSingle();
        if (cancelled || current !== id) return;
        setViewer(profile ? { id, name: profile.display_name, username: profile.username, avatarPath: profile.avatar_path } : null);
      }, 0);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  // ("Loading comments…" shows until this finishes; Try again sets it back.)
  const loadFirstPage = useCallback(async () => {
    const [page, total] = await Promise.all([fetchCommentPage(postId), fetchCommentCount(postId)]);
    if (!page.ok) return setLoad("error");
    setThreads(buildThreads(page.value.topLevel, page.value.replies));
    setHasMore(page.value.hasMore);
    setCount(total);
    // A #comment-… link marks that comment (scrolled to once it's drawn).
    const hash = window.location.hash;
    setHighlight(hash.startsWith("#comment-") ? hash.slice("#comment-".length) : null);
    setLoad("ready");
  }, [postId]);

  // Load once the section is near the screen; at once for a #comment-… link.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    // The observer always reports once straight away: a link loads then.
    const linked = window.location.hash.startsWith("#comment-");
    const observer = new IntersectionObserver(
      (entries) => {
        if (!linked && !entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        loadFirstPage();
      },
      { rootMargin: LOAD_MARGIN },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [loadFirstPage]);

  // A #comment-… link: once the comments are drawn, scroll to that one. (It
  // may not be on the first page; then the page just stays where it is.)
  useEffect(() => {
    if (load === "ready" && highlight) document.getElementById(`comment-${highlight}`)?.scrollIntoView({ block: "start" });
  }, [load, highlight]);

  async function showMore() {
    const last = threads.at(-1)?.comment;
    if (!last) return;
    setLoadingMore(true);
    setMoreError(false);
    const page = await fetchCommentPage(postId, last);
    setLoadingMore(false);
    if (!page.ok) return setMoreError(true);
    setThreads((current) => [...current, ...buildThreads(page.value.topLevel, page.value.replies)]);
    setHasMore(page.value.hasMore);
  }

  async function post(body: string): Promise<string | null> {
    const result = await postComment(postId, body, null);
    if (!result.ok) return commentError(result.error, "post");
    setThreads((current) => [{ comment: result.value, replies: [] }, ...current]);
    setCount((n) => (n ?? 0) + 1);
    return null;
  }

  async function reply(threadId: string, body: string): Promise<string | null> {
    const result = await postComment(postId, body, threadId);
    if (!result.ok) return commentError(result.error, "post");
    setThreads((current) => current.map((t) => (t.comment.id === threadId ? { ...t, replies: [...t.replies, result.value] } : t)));
    setCount((n) => (n ?? 0) + 1);
    setReplyTo(null);
    return null;
  }

  async function save(id: string, body: string): Promise<string | null> {
    const result = await editComment(id, body);
    if (!result.ok) return commentError(result.error, "save");
    const swap = (c: Comment) => (c.id === id ? result.value : c);
    setThreads((current) => current.map((t) => ({ comment: swap(t.comment), replies: t.replies.map(swap) })));
    return null;
  }

  async function remove(id: string): Promise<string | null> {
    const result = await deleteComment(id);
    if (!result.ok) return commentError(result.error, "delete");
    setThreads((current) => afterDelete(current, id, result.value));
    if (result.value !== "gone") setCount((n) => (n === null ? n : Math.max(0, n - 1)));
    if (replyTo?.threadId === id) setReplyTo(null); // a deleted comment takes no replies
    return null;
  }

  function startReply(thread: Thread, to: Comment) {
    setReplyTo({ threadId: thread.comment.id, toId: to.id, mention: mentionFor(to) });
  }

  const nextPath = `/writing/${slug}#comments`;

  return (
    <div ref={sectionRef}>
      <h2 id="comments-heading" className="font-serif text-2xl font-semibold">
        Comments
        {count !== null && count > 0 && <span className="ml-2 font-sans text-base font-normal text-fg-muted">{count}</span>}
      </h2>

      <div className="mt-5">
        {viewer === undefined ? (
          // Holds a line's space while the session is read, so little moves.
          <div className="h-6" aria-hidden="true" />
        ) : viewer ? (
          <div className="flex gap-3">
            <Avatar name={viewer.name} path={viewer.avatarPath} size={36} />
            <div className="min-w-0 flex-1">
              <CommentForm
                label="Write a comment"
                placeholder={`Comment as ${viewer.name}…`}
                submitLabel="Post"
                onSubmit={post}
              />
            </div>
          </div>
        ) : (
          <p className="text-fg-muted">
            <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="text-fg underline underline-offset-4">
              Sign in
            </Link>{" "}
            to join the conversation.
          </p>
        )}
      </div>

      <div aria-live="polite" className="mt-8">
        {(load === "idle" || load === "loading") && <p className="text-fg-muted">Loading comments…</p>}
        {load === "error" && (
          <p className="text-fg-muted">
            The comments couldn&apos;t be loaded.{" "}
            <button
              type="button"
              onClick={() => {
                setLoad("loading");
                loadFirstPage();
              }}
              className="cursor-pointer text-fg underline underline-offset-4"
            >
              Try again
            </button>
          </p>
        )}
        {load === "ready" && threads.length === 0 && (
          <p className="text-fg-muted">No comments yet.{viewer ? " Be the first." : ""}</p>
        )}
      </div>

      {threads.length > 0 && (
        <ol className="flex flex-col gap-8">
          {threads.map((thread) => {
            const closed = !!thread.comment.deleted_at; // a deleted comment takes no new replies
            return (
              <li key={thread.comment.id}>
                <CommentView
                  comment={thread.comment}
                  viewer={viewer}
                  highlighted={highlight === thread.comment.id}
                  onReply={viewer && !closed ? () => startReply(thread, thread.comment) : undefined}
                  onSave={save}
                  onDelete={remove}
                />
                {(thread.replies.length > 0 || replyTo?.threadId === thread.comment.id) && (
                  // The line runs down from under the comment's picture.
                  <ol className="mt-5 ml-[17px] flex flex-col gap-5 border-l border-rule pl-[18px] sm:pl-[30px]">
                    {thread.replies.map((r) => (
                      <li key={r.id}>
                        <CommentView
                          comment={r}
                          viewer={viewer}
                          small
                          highlighted={highlight === r.id}
                          onReply={viewer && !closed ? () => startReply(thread, r) : undefined}
                          onSave={save}
                          onDelete={remove}
                        />
                      </li>
                    ))}
                    {viewer && replyTo?.threadId === thread.comment.id && (
                      <li className="flex gap-3">
                        <Avatar name={viewer.name} path={viewer.avatarPath} size={28} />
                        <div className="min-w-0 flex-1">
                          <CommentForm
                            key={replyTo.toId}
                            label="Write a reply"
                            placeholder={`Reply as ${viewer.name}…`}
                            submitLabel="Reply"
                            initial={replyTo.mention}
                            autoFocus
                            onSubmit={(body) => reply(thread.comment.id, body)}
                            onCancel={() => setReplyTo(null)}
                          />
                        </div>
                      </li>
                    )}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {hasMore && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="button" onClick={showMore} disabled={loadingMore} className="button-secondary" autoComplete="off">
            {loadingMore ? "Loading…" : "Show more comments"}
          </button>
          {moreError && <p className="text-sm text-danger">They couldn&apos;t be loaded. Try again.</p>}
        </div>
      )}
    </div>
  );
}

/** One comment: picture, name, time, text, and the actions the viewer may take. */
function CommentView({
  comment,
  viewer,
  small = false,
  highlighted,
  onReply,
  onSave,
  onDelete,
}: {
  comment: Comment;
  viewer: Viewer | null | undefined;
  small?: boolean;
  highlighted: boolean;
  onReply?: () => void;
  onSave: (id: string, body: string) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const size = small ? 28 : 36;
  const state = authorState(comment);
  const own = !!viewer && comment.user_id === viewer.id;

  async function confirmDelete() {
    setDeleting(true);
    setError(null);
    const failure = await onDelete(comment.id);
    // On success this comment usually unmounts; a placeholder stays.
    setDeleting(false);
    setConfirming(false);
    setError(failure);
  }

  return (
    <article
      id={`comment-${comment.id}`}
      className={`-mx-3 flex scroll-mt-28 gap-3 rounded-lg px-3 py-2 transition-colors duration-700 target:bg-accent-soft ${
        highlighted ? "bg-accent-soft" : ""
      }`}
    >
      {state === "author" && comment.author ? (
        <Avatar name={comment.author.display_name} path={comment.author.avatar_path} size={size} />
      ) : (
        <span aria-hidden="true" className="shrink-0 rounded-full bg-bg-raised" style={{ width: size, height: size }} />
      )}

      <div className="min-w-0 flex-1">
        {state === "placeholder" ? (
          <p className="pt-1.5 text-fg-muted italic">This comment was deleted.</p>
        ) : (
          <>
            <header className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
              {comment.author ? (
                <>
                  <span className="font-medium text-fg">{comment.author.display_name}</span>
                  <span className="text-fg-muted">@{comment.author.username}</span>
                  {comment.by_admin && <Badge toneKey="author">Author</Badge>}
                </>
              ) : (
                <span className="text-fg-muted italic">deleted user</span>
              )}
              <span className="text-fg-muted" aria-hidden="true">
                ·
              </span>
              <a href={`#comment-${comment.id}`} className="text-fg-muted no-underline hover:text-fg hover:underline">
                <time dateTime={comment.created_at} title={fullDate(comment.created_at)}>
                  {relativeTime(comment.created_at)}
                </time>
              </a>
              {comment.edited_at && (
                <span className="text-fg-muted" title={`Edited ${fullDate(comment.edited_at)}`}>
                  · edited
                </span>
              )}
            </header>

            {editing ? (
              <div className="mt-2">
                <CommentForm
                  label="Edit your comment"
                  placeholder=""
                  submitLabel="Save"
                  initial={comment.body}
                  autoFocus
                  onSubmit={async (body) => {
                    const failure = await onSave(comment.id, body);
                    if (!failure) setEditing(false);
                    return failure;
                  }}
                  onCancel={() => setEditing(false)}
                />
              </div>
            ) : (
              // Plain text: line breaks kept, nothing turned into links.
              <p className="mt-1 leading-relaxed break-words whitespace-pre-wrap text-fg">{comment.body}</p>
            )}

            {!editing && (onReply || own) && (
              <div className="-ml-3 flex flex-wrap items-center text-sm">
                {confirming ? (
                  <>
                    <span className="px-3 text-fg">Delete this comment?</span>
                    <button
                      type="button"
                      onClick={confirmDelete}
                      disabled={deleting}
                      className="row-action text-danger hover:text-danger"
                      autoComplete="off"
                    >
                      {deleting ? "Deleting…" : "Delete"}
                    </button>
                    <button type="button" onClick={() => setConfirming(false)} disabled={deleting} className="row-action" autoComplete="off">
                      Keep
                    </button>
                  </>
                ) : (
                  <>
                    {onReply && (
                      <button type="button" onClick={onReply} className="row-action">
                        Reply
                      </button>
                    )}
                    {own && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setEditing(true);
                          }}
                          className="row-action"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setConfirming(true);
                          }}
                          className="row-action"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </article>
  );
}

/** "Oct 8, 2026, 2:15 PM" in the reader's own time zone (the tooltip on hover). */
function fullDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
