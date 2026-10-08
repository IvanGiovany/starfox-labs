import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/badge";
import { requireAdmin } from "@/lib/auth";
import { relativeTime } from "@/lib/comments";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DeleteCommentButton } from "./delete-comment-button";

// Moderation: the latest comments across every article, newest first, each
// with a link to it on its article and a Delete. (On an article itself the
// admin also sees Delete on every comment.) Placeholders of deleted comments
// aren't listed: there's nothing left in them to moderate.

/** How many of the latest comments are listed. */
const LIMIT = 100;

export default function AdminComments() {
  return (
    <>
      <h1 className="mb-5 font-serif text-3xl font-semibold">Comments</h1>
      {/* Its own boundary: client navigations inside /admin don't re-run the layout's. */}
      <Suspense fallback={<p className="py-6 text-fg-muted">Loading comments…</p>}>
        <LatestComments />
      </Suspense>
    </>
  );
}

async function LatestComments() {
  await requireAdmin("/admin/comments");
  const supabase = await createSupabaseServerClient();
  const { data, error, count } = await supabase
    .from("comments")
    .select(
      "id, parent_id, body, by_admin, created_at, edited_at, post:posts(slug, title, status), author:profiles(username, display_name, avatar_path)",
      { count: "exact" },
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(LIMIT);
  if (error) throw new Error(`Failed to load comments: ${error.message}`);

  if (data.length === 0) {
    return <p className="rounded-xl bg-bg-raised px-5 py-8 text-fg-muted">No comments yet.</p>;
  }

  const now = new Date();
  const total = count ?? data.length;
  return (
    <>
      <p className="mb-4 text-sm text-fg-muted">
        {total > data.length ? `The latest ${data.length} of ${total} comments.` : `${total} comment${total === 1 ? "" : "s"}.`}
      </p>
      <ul className="divide-y divide-rule border-y border-rule">
        {data.map((comment) => (
          <li key={comment.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:gap-6">
            <div className="flex min-w-0 flex-1 gap-3">
              {comment.author ? (
                <Avatar name={comment.author.display_name} path={comment.author.avatar_path} size={32} />
              ) : (
                <span aria-hidden="true" className="size-8 shrink-0 rounded-full bg-bg-raised" />
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                  {comment.author ? (
                    <>
                      <span className="font-medium text-fg">{comment.author.display_name}</span>
                      <span className="text-fg-muted">@{comment.author.username}</span>
                    </>
                  ) : (
                    <span className="text-fg-muted italic">deleted user</span>
                  )}
                  {comment.by_admin && <Badge toneKey="author">Author</Badge>}
                  <span className="text-fg-muted">
                    · {relativeTime(comment.created_at, now)}
                    {comment.edited_at && " · edited"}
                    {comment.parent_id && " · reply"}
                  </span>
                </p>
                <p className="mt-1 line-clamp-4 break-words whitespace-pre-wrap text-fg">{comment.body}</p>
                {comment.post && (
                  <p className="mt-1 text-sm text-fg-muted">
                    on{" "}
                    {comment.post.status === "published" ? (
                      <a
                        href={`/writing/${comment.post.slug}#comment-${comment.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-fg-muted underline underline-offset-4 hover:text-fg"
                      >
                        {comment.post.title} ↗
                      </a>
                    ) : (
                      <>
                        {comment.post.title} <span className="italic">(not published)</span>
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-1 pl-11 text-sm sm:pl-0">
              <DeleteCommentButton id={comment.id} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
