"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useTransition, type ReactNode } from "react";
import { Badge } from "@/components/badge";
import { CheatSheetPanel } from "@/components/admin/cheat-sheet-panel";
import { handleMarkdownShortcut, MarkdownToolbar } from "@/components/admin/markdown-toolbar";
import { TagInput } from "@/components/admin/tag-input";
import { removeBackup, useLocalBackup } from "@/components/admin/use-local-backup";
import {
  firstSentence,
  LIMITS,
  normalizeTag,
  slugify,
  statusAfter,
  validatePost,
  type EditablePost,
  type PostFieldErrors,
  type PostFields,
  type PostStatus,
  type SaveIntent,
} from "@/lib/admin/post-form";
import { savePost } from "./actions";

const EMPTY: PostFields = { title: "", slug: "", summary: "", tags: [], youtubeUrl: "", bodyMd: "" };

/** What the database holds, as far as the editor knows. */
type Saved = { id: string | null; updatedAt: string | null; status: PostStatus; fields: PostFields };

const BLANK: Saved = { id: null, updatedAt: null, status: "draft", fields: EMPTY };

// Field order, so the first invalid one gets the focus.
const FIELD_ORDER: (keyof PostFields)[] = ["title", "slug", "summary", "tags", "youtubeUrl", "bodyMd"];

function sameFields(a: PostFields, b: PostFields): boolean {
  return FIELD_ORDER.every((key) => (key === "tags" ? a.tags.join(",") === b.tags.join(",") : a[key] === b[key]));
}

/** Unsaved text is backed up per article; new articles share one slot until their first save. */
function backupKey(id: string | null): string {
  return `starfox:post-backup:${id ?? "new"}`;
}

/** The slug follows the title until Ivan edits it, and never once the article has been published. */
function slugFollowsTitle(status: PostStatus, fields: PostFields): boolean {
  return status === "draft" && fields.slug === slugify(fields.title);
}

function timeNow(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * The article form for /admin/writing/new and /admin/writing/[id].
 * `post` is null on the "new" page; after the first save the address changes
 * to the article's own URL without reloading, so nothing typed is lost.
 */
export function PostEditor({
  post,
  tagSuggestions,
  cheatSheet,
}: {
  post: EditablePost | null;
  tagSuggestions: string[];
  /** WRITING.md, rendered on the server. */
  cheatSheet: ReactNode;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState<Saved>(post ?? BLANK);
  const [fields, setFields] = useState<PostFields>(post?.fields ?? EMPTY);
  const [slugLinked, setSlugLinked] = useState(() => slugFollowsTitle(post?.status ?? "draft", post?.fields ?? EMPTY));
  const [errors, setErrors] = useState<PostFieldErrors>({});
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [savingIntent, setSavingIntent] = useState<SaveIntent | null>(null);
  const [pending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const published = saved.status === "published";
  const dirty = !sameFields(fields, saved.fields);
  const liveSlug = published ? saved.fields.slug : null;
  const backup = useLocalBackup(backupKey(saved.id), fields, dirty, (value) => sameFields(value, saved.fields));

  // Closing the tab, reloading or leaving the site with unsaved text asks first.
  // (Links inside the admin don't trigger this; the backup covers those.)
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function restoreBackup() {
    const restored = backup.restore();
    if (!restored) return;
    setFields(restored);
    setSlugLinked(slugFollowsTitle(saved.status, restored));
    setNotice({ tone: "ok", text: "Restored. Save to keep it." });
  }

  function update<K extends keyof PostFields>(key: K, value: PostFields[K]) {
    setFields((current) => ({
      ...current,
      [key]: value,
      ...(key === "title" && slugLinked ? { slug: slugify(value as string) } : {}),
    }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined })); // fixed once edited
  }

  function save(intent: SaveIntent, addAnother = false) {
    if (pending) return;
    const status = statusAfter(intent, saved.status);
    const checked = validatePost(fields, status);
    if (!checked.ok) {
      setErrors(checked.fieldErrors);
      setNotice({ tone: "error", text: "Check the highlighted fields." });
      const first = FIELD_ORDER.find((key) => checked.fieldErrors[key]);
      document.getElementById(`post-${first}`)?.focus();
      return;
    }

    const submitted = fields;
    setErrors({});
    setNotice(null);
    setSavingIntent(intent);
    startTransition(async () => {
      const result = await savePost({ id: saved.id, updatedAt: saved.updatedAt, status: saved.status, intent, fields: submitted });
      setSavingIntent(null);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setNotice({ tone: "error", text: result.error });
        return;
      }

      if (addAnother) {
        const label = `Saved “${checked.data.title}”.`;
        removeBackup(backupKey(null));
        if (post === null) {
          // Already on the "new" page: just clear the form.
          setSaved(BLANK);
          setFields(EMPTY);
          setSlugLinked(true);
          setNotice({ tone: "ok", text: `${label} Start the next one.` });
          window.history.replaceState(null, "", "/admin/writing/new");
          window.scrollTo({ top: 0 });
        } else {
          router.push("/admin/writing/new");
        }
        return;
      }

      // The server may have filled in the slug and summary, and trimmed things.
      const cleaned: PostFields = { ...checked.data, slug: result.slug, summary: result.summary };
      setSaved({ id: result.id, updatedAt: result.updatedAt, status: result.status, fields: cleaned });
      // Keep anything typed while saving; otherwise show the cleaned-up values.
      setFields((current) => (current === submitted ? cleaned : current));
      if (result.status === "published") setSlugLinked(false);

      const verb = intent === "publish" ? "Published" : intent === "unpublish" ? "Unpublished" : "Saved";
      setNotice({ tone: "ok", text: `${verb} at ${timeNow()}.` });
      if (saved.id === null) {
        removeBackup(backupKey(null)); // from now on it's backed up under its own id
        window.history.replaceState(null, "", `/admin/writing/${result.id}`);
      }
    });
  }

  // Ctrl/⌘+S saves from anywhere on the page instead of saving the HTML file.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      save("save");
    }
  });
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const busy = (intent: SaveIntent) => pending && savingIntent === intent;
  const fieldProps = (key: keyof PostFields) => ({
    id: `post-${key}`,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `post-${key}-error` : undefined,
  });

  return (
    <form noValidate onSubmit={(e) => e.preventDefault()} className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link href="/admin/writing" className="row-action -ml-3 no-underline">
          ← All articles
        </Link>
        <Badge toneKey={published ? "read" : "learning"}>{published ? "Published" : "Draft"}</Badge>
        {liveSlug && (
          <a href={`/writing/${liveSlug}`} target="_blank" rel="noreferrer" className="text-fg-muted hover:text-fg">
            View ↗
          </a>
        )}
      </div>

      {backup.offer && (
        <div role="alert" className="mb-6 rounded-xl bg-bg-raised px-4 py-3 text-sm">
          <p>
            Unsaved changes from{" "}
            {new Date(backup.offer.savedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} were found on
            this device.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={restoreBackup} className="button-primary">
              Restore them
            </button>
            <button type="button" onClick={backup.discard} className="row-action border border-rule">
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        <Field label="Title" htmlFor="post-title" error={errors.title} errorId="post-title-error">
          <input
            {...fieldProps("title")}
            value={fields.title}
            onChange={(e) => update("title", e.target.value)}
            maxLength={LIMITS.title}
            placeholder="What's it about?"
            autoFocus={post === null}
            className="field font-serif text-2xl leading-tight"
          />
        </Field>

        <Field
          label="Address"
          htmlFor="post-slug"
          error={errors.slug}
          errorId="post-slug-error"
          hint={
            liveSlug && fields.slug !== liveSlug ? (
              <span className="text-danger">
                This article is live at /writing/{liveSlug}. Changing the address breaks links to the old one.
              </span>
            ) : slugLinked ? (
              "Follows the title until you edit it."
            ) : null
          }
        >
          <div className="flex items-center gap-1">
            <span className="shrink-0 text-fg-muted">/writing/</span>
            <input
              {...fieldProps("slug")}
              value={fields.slug}
              onChange={(e) => {
                setSlugLinked(false);
                update("slug", e.target.value.toLowerCase());
              }}
              maxLength={LIMITS.slug}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="field font-mono text-[0.9375rem]"
            />
          </div>
        </Field>

        <Field
          label="Summary"
          optional
          htmlFor="post-summary"
          error={errors.summary}
          errorId="post-summary-error"
          hint={fields.summary.trim() ? null : "Left empty, the first sentence of the article is used."}
        >
          <textarea
            {...fieldProps("summary")}
            value={fields.summary}
            onChange={(e) => update("summary", e.target.value)}
            maxLength={LIMITS.summary}
            rows={2}
            placeholder={firstSentence(fields.bodyMd) || "One or two sentences for cards and link previews."}
            className="field field-sizing-content min-h-20 resize-y"
          />
        </Field>

        <Field label="Tags" optional htmlFor="post-tags" error={errors.tags} errorId="post-tags-error">
          <TagInput
            id="post-tags"
            tags={fields.tags}
            onChange={(tags) => update("tags", tags)}
            suggestions={tagSuggestions}
            normalize={normalizeTag}
            max={LIMITS.tags}
            invalid={Boolean(errors.tags)}
            describedBy={errors.tags ? "post-tags-error" : undefined}
          />
        </Field>

        <Field label="YouTube video" optional htmlFor="post-youtubeUrl" error={errors.youtubeUrl} errorId="post-youtubeUrl-error">
          <input
            {...fieldProps("youtubeUrl")}
            type="url"
            inputMode="url"
            value={fields.youtubeUrl}
            onChange={(e) => update("youtubeUrl", e.target.value)}
            placeholder="https://youtu.be/…"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="field"
          />
        </Field>

        <Field label="Article" htmlFor="post-bodyMd" error={errors.bodyMd} errorId="post-bodyMd-error">
          {/* The toolbar stays in view while scrolling a long article. */}
          <div className="sticky top-0 z-10 -mx-1 mb-1.5 bg-bg/95 px-1 py-1 backdrop-blur">
            <MarkdownToolbar textareaRef={bodyRef}>
              <CheatSheetPanel>{cheatSheet}</CheatSheetPanel>
            </MarkdownToolbar>
          </div>
          <textarea
            {...fieldProps("bodyMd")}
            ref={bodyRef}
            value={fields.bodyMd}
            onChange={(e) => update("bodyMd", e.target.value)}
            onKeyDown={handleMarkdownShortcut}
            placeholder="Write in markdown…"
            className="field field-sizing-content min-h-[60vh] resize-y font-mono text-[0.9375rem] leading-relaxed"
          />
        </Field>
      </div>

      {/* Sticky save bar: always within thumb reach on a phone. */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-rule bg-bg/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:mx-0 sm:px-0">
        <p
          role={notice?.tone === "error" ? "alert" : "status"}
          className={`mb-2 min-h-5 text-sm ${notice?.tone === "error" ? "text-danger" : "text-fg-muted"}`}
        >
          {notice?.text ?? (dirty ? "Unsaved changes" : saved.id ? "All changes saved" : "")}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {published ? (
            <>
              <button type="button" disabled={pending} onClick={() => save("save")} className="button-primary flex-1 sm:flex-none">
                {busy("save") ? "Updating…" : "Update"}
              </button>
              <button type="button" disabled={pending} onClick={() => save("unpublish")} className="row-action border border-rule">
                {busy("unpublish") ? "Unpublishing…" : "Unpublish"}
              </button>
            </>
          ) : (
            <>
              <button type="button" disabled={pending} onClick={() => save("save")} className="row-action border border-rule">
                {busy("save") ? "Saving…" : "Save draft"}
              </button>
              <button type="button" disabled={pending} onClick={() => save("publish")} className="button-primary flex-1 sm:flex-none">
                {busy("publish") ? "Publishing…" : "Publish"}
              </button>
            </>
          )}
          <button type="button" disabled={pending} onClick={() => save("save", true)} className="row-action sm:ml-auto">
            <span className="sm:hidden">Save + new</span>
            <span className="hidden sm:inline">Save and add another</span>
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  optional,
  hint,
  error,
  errorId,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  hint?: React.ReactNode;
  error?: string;
  errorId: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {label} {optional && <span className="font-normal text-fg-muted">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-sm text-fg-muted">{hint}</p>
      )}
    </div>
  );
}
