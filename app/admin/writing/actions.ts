"use server";

import { refresh, updateTag } from "next/cache";
import { firstSentence, slugify, validatePost, type PostFieldErrors, type PostFields, type PostStatus } from "@/lib/admin/post-form";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Article actions for the list and the editor. Each one checks the admin on
// the server (never trust the button), and RLS checks again in the database.

export type ActionResult = { ok: true } | { ok: false; error: string };

type DbError = { code?: string; message?: string };

/** A duplicate slug (unique constraint) or a malformed one (check constraint). */
function isSlugError(error: DbError): boolean {
  const message = error.message ?? "";
  return (error.code === "23505" && message.includes("slug")) || message.includes("posts_slug_check");
}

/** Turns database errors into sentences; unknown errors get a generic message. */
function explain(error: DbError): string {
  const message = error.message ?? "";
  if (error.code === "23505" && message.includes("slug")) {
    return "Another article already uses this address. Pick a different one.";
  }
  if (message.includes("posts_slug_check")) {
    return "Use lowercase letters, numbers and single hyphens in the address.";
  }
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

export type SavePostInput = {
  /** null for a new article. */
  id: string | null;
  /** The `updated_at` the editor loaded, so we never overwrite newer changes. */
  updatedAt: string | null;
  /** The status the editor shows now; "save" keeps it. */
  status: PostStatus;
  intent: "save" | "publish" | "unpublish";
  fields: PostFields;
};

export type SavePostResult =
  | { ok: true; id: string; slug: string; summary: string; status: PostStatus; updatedAt: string }
  | { ok: false; error: string; fieldErrors?: PostFieldErrors };

/** The editor's Save draft / Publish / Update / Unpublish buttons. */
export async function savePost(input: SavePostInput): Promise<SavePostResult> {
  await requireAdmin();

  const status: PostStatus =
    input.intent === "publish" ? "published" : input.intent === "unpublish" ? "draft" : input.status;
  const checked = validatePost(input.fields, status);
  if (!checked.ok) return { ok: false, error: "Check the highlighted fields.", fieldErrors: checked.fieldErrors };

  const { title, slug, summary, tags, youtubeUrl, bodyMd } = checked.data;
  const row = {
    title,
    // Titles with no Latin letters (e.g. Cyrillic) slugify to "", so fall back to a short random one.
    slug: slug || slugify(title) || `post-${crypto.randomUUID().slice(0, 8)}`,
    summary: summary || firstSentence(bodyMd),
    tags,
    youtube_url: youtubeUrl || null,
    body_md: bodyMd,
    status,
  };

  const supabase = await createSupabaseServerClient();
  const columns = "id, slug, summary, status, updated_at";
  const { data, error } =
    input.id === null
      ? await supabase.from("posts").insert(row).select(columns).single()
      : await supabase
          .from("posts")
          .update(row)
          .eq("id", input.id)
          .eq("updated_at", input.updatedAt ?? "") // only if nobody saved in between
          .select(columns)
          .maybeSingle();

  if (error) {
    const message = explain(error);
    return { ok: false, error: message, fieldErrors: isSlugError(error) ? { slug: message } : undefined };
  }
  if (!data) {
    return {
      ok: false,
      error: "This article changed somewhere else (or was deleted). Copy anything you need, then reload.",
    };
  }

  updateTag("posts");
  refresh();
  return {
    ok: true,
    id: data.id,
    slug: data.slug,
    summary: data.summary,
    status: data.status as PostStatus,
    updatedAt: data.updated_at,
  };
}
