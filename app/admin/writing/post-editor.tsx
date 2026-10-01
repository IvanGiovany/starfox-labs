"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { Badge } from "@/components/badge";
import { CheatSheetPanel } from "@/components/admin/cheat-sheet-panel";
import { BodyImagePanel } from "@/components/admin/body-image-panel";
import { Field } from "@/components/admin/form-field";
import { ImageField } from "@/components/admin/image-field";
import { handleMarkdownShortcut, MarkdownToolbar } from "@/components/admin/markdown-toolbar";
import { SaveBar } from "@/components/admin/save-bar";
import { TagInput } from "@/components/admin/tag-input";
import { useMediaQuery } from "@/components/admin/use-media-query";
import { useBodyImages } from "@/components/admin/use-body-images";
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
import type { LinkTarget } from "@/lib/admin/items/link-target";
import { savePost } from "./actions";
import { LivePreview } from "./live-preview";

const EMPTY: PostFields = { title: "", slug: "", summary: "", tags: [], youtubeUrl: "", coverImageUrl: "", bodyMd: "" };

/** What the database holds, as far as the editor knows. */
type Saved = { id: string | null; updatedAt: string | null; status: PostStatus; publishedAt: string | null; fields: PostFields };

const BLANK: Saved = { id: null, updatedAt: null, status: "draft", publishedAt: null, fields: EMPTY };

// Field order, so the first invalid one gets the focus.
const FIELD_ORDER: (keyof PostFields)[] = ["title", "slug", "summary", "tags", "youtubeUrl", "coverImageUrl", "bodyMd"];

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

// Layout: Write (the form), Split (form + live preview, wide screens only) or
// Preview (the article alone, like the public page). Write/Split is remembered
// per device; Preview is a moment, not a preference, so it isn't.
type Layout = "write" | "split";
const LAYOUT_KEY = "starfox:editor-layout";
const layoutListeners = new Set<() => void>();

function readLayout(): Layout | null {
  try {
    const value = localStorage.getItem(LAYOUT_KEY);
    return value === "write" || value === "split" ? value : null;
  } catch {
    return null;
  }
}

function storeLayout(layout: Layout) {
  try {
    localStorage.setItem(LAYOUT_KEY, layout);
  } catch {} // blocked storage: the choice just isn't remembered
  layoutListeners.forEach((listener) => listener());
}

function subscribeLayout(listener: () => void) {
  layoutListeners.add(listener);
  return () => layoutListeners.delete(listener);
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
  linkTarget = null,
}: {
  post: EditablePost | null;
  /** "Write the article": the item this new article is for. */
  linkTarget?: LinkTarget | null;
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
  // "pending": the first save links this article to linkTarget; "linked" once it has.
  const [link, setLink] = useState<{ state: "pending" | "linked" } | { state: "failed"; error: string } | null>(
    linkTarget && !linkTarget.hasArticle ? { state: "pending" } : null,
  );
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [imagePanelOpen, setImagePanelOpen] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const bodyImages = useBodyImages({
    textareaRef: bodyRef,
    updateBody: (change) => setFields((current) => ({ ...current, bodyMd: change(current.bodyMd) })),
    onError: (message) => setNotice({ tone: "error", text: message }),
  });
  const uploadingImages = bodyImages.pending + (coverUploading ? 1 : 0);

  const wide = useMediaQuery("(min-width: 80rem)"); // room for the form and the preview side by side
  const storedLayout = useSyncExternalStore(subscribeLayout, readLayout, () => null);
  const [previewing, setPreviewing] = useState(false);
  const layout: Layout = wide ? (storedLayout ?? "split") : "write";
  const mode = previewing ? "preview" : layout;

  function showMode(next: Layout | "preview") {
    setPreviewing(next === "preview");
    if (next !== "preview" && wide) storeLayout(next);
  }

  // Full preview: hide the admin bar and tabs (see globals.css) and start at the top.
  useEffect(() => {
    if (mode !== "preview") return;
    document.documentElement.dataset.editorPreview = "";
    window.scrollTo({ top: 0 });
    return () => {
      delete document.documentElement.dataset.editorPreview;
    };
  }, [mode]);

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
    const backedUp = backup.restore();
    if (!backedUp) return;
    const restored = { ...EMPTY, ...backedUp }; // backups from before a field existed lack it
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
    // "Saved at 14:32" is out of date once something changes; errors stay until dealt with.
    if (notice?.tone === "ok") setNotice(null);
  }

  function save(intent: SaveIntent, addAnother = false) {
    if (pending) return;
    if (uploadingImages > 0) {
      // Saving now would store the "⏳ Uploading…" placeholders as article text, or miss the new cover.
      setNotice({ tone: "error", text: "Wait for the images to finish uploading, then save." });
      return;
    }
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
      const linkTo = link?.state === "pending" && saved.id === null && linkTarget ? { section: linkTarget.section, itemId: linkTarget.itemId } : null;
      const result = await savePost({ id: saved.id, updatedAt: saved.updatedAt, status: saved.status, intent, fields: submitted, linkTo });
      setSavingIntent(null);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setNotice({ tone: "error", text: result.error });
        return;
      }

      if (result.link) setLink(result.link.ok ? { state: "linked" } : { state: "failed", error: result.link.error });

      if (addAnother) {
        setLink(null); // the next article isn't for that item
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
      setSaved({ id: result.id, updatedAt: result.updatedAt, status: result.status, publishedAt: result.publishedAt, fields: cleaned });
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
  // Escape leaves the full preview (unless it's closing the cheat sheet).
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      save("save");
    } else if (event.key === "Escape" && previewing && !document.querySelector("dialog[open]")) {
      setPreviewing(false);
    }
  });
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const fieldProps = (key: keyof PostFields) => ({
    id: `post-${key}`,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `post-${key}-error` : undefined,
  });

  return (
    // autoComplete="off": no Firefox form-state restore over reloads (see item-editor.tsx).
    <form noValidate autoComplete="off" onSubmit={(e) => e.preventDefault()} className={mode === "split" ? "" : "mx-auto max-w-3xl"}>
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
        <div role="group" aria-label="View" className="ml-auto flex gap-1 rounded-lg bg-bg-raised p-1">
          <ModeButton pressed={mode === "write"} onClick={() => showMode("write")}>
            Write
          </ModeButton>
          {wide && (
            <ModeButton pressed={mode === "split"} onClick={() => showMode("split")}>
              Split
            </ModeButton>
          )}
          <ModeButton pressed={mode === "preview"} onClick={() => showMode("preview")}>
            Preview
          </ModeButton>
        </div>
      </div>

      {linkTarget && <LinkBanner target={linkTarget} link={link} />}

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

      <div className={mode === "split" ? "grid grid-cols-2 items-start gap-10" : ""}>
        {/* Hidden, not removed, in full preview: the text area keeps its undo history. */}
        <div className={`flex flex-col gap-6 ${mode === "preview" ? "hidden" : ""}`}>
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

          <Field
            label="Cover image"
            optional
            htmlFor="post-coverImageUrl"
            error={errors.coverImageUrl}
            errorId="post-coverImageUrl-error"
            hint={fields.coverImageUrl ? null : "Shown above the article. Resized to 1200 px wide and saved as our own copy."}
          >
            <ImageField
              id="post-coverImageUrl"
              imageUrl={fields.coverImageUrl}
              // The cover box has a fixed shape, so the URL is kept without its size hint.
              onAdded={(image) => update("coverImageUrl", image.url.split("#")[0])}
              onRemove={() => update("coverImageUrl", "")}
              use="cover"
              folder="writing"
              describedBy={errors.coverImageUrl ? "post-coverImageUrl-error" : undefined}
              onBusyChange={(busy) => {
                setCoverUploading(busy);
                if (busy) setNotice((current) => (current?.tone === "ok" ? null : current)); // "Saved at …" is out of date
              }}
            />
          </Field>

          <Field label="Article" htmlFor="post-bodyMd" error={errors.bodyMd} errorId="post-bodyMd-error">
            {/* The toolbar stays in view while scrolling a long article. */}
            <div className="sticky top-0 z-10 -mx-1 mb-1.5 bg-bg/95 px-1 py-1 backdrop-blur">
              <MarkdownToolbar textareaRef={bodyRef} onImage={() => setImagePanelOpen((open) => !open)} imageOpen={imagePanelOpen}>
                <CheatSheetPanel>{cheatSheet}</CheatSheetPanel>
              </MarkdownToolbar>
              {imagePanelOpen && (
                <BodyImagePanel
                  onFiles={bodyImages.addFiles}
                  onUrl={bodyImages.addUrl}
                  onClose={() => setImagePanelOpen(false)}
                />
              )}
            </div>
            <textarea
              {...fieldProps("bodyMd")}
              ref={bodyRef}
              value={fields.bodyMd}
              onChange={(e) => update("bodyMd", e.target.value)}
              onKeyDown={handleMarkdownShortcut}
            onPaste={bodyImages.onPaste}
            onDrop={bodyImages.onDrop}
              placeholder="Write in markdown…"
              className="field field-sizing-content min-h-[60vh] resize-y font-mono text-[0.9375rem] leading-relaxed"
            />
          </Field>
        </div>

        <LivePreview
          fields={fields}
          publishedAt={published ? saved.publishedAt : null}
          active={mode !== "write"}
          hidden={mode === "write"}
          framed={mode === "split"}
        />
      </div>

      <SaveBar
        status={
          notice?.text ??
          (uploadingImages > 0
            ? `Uploading ${uploadingImages} image${uploadingImages === 1 ? "" : "s"}…`
            : dirty
              ? "Unsaved changes"
              : saved.id
                ? "All changes saved"
                : "")
        }
        isError={notice?.tone === "error"}
        published={published}
        pending={pending}
        savingIntent={savingIntent}
        onSave={save}
      />
    </form>
  );
}

function ModeButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="min-h-9 cursor-pointer rounded-md px-3 text-fg-muted hover:text-fg aria-pressed:bg-bg aria-pressed:text-fg aria-pressed:shadow-sm"
    >
      {children}
    </button>
  );
}

/** Shown when this article is being written for an item ("Write the article"). */
function LinkBanner({
  target,
  link,
}: {
  target: LinkTarget;
  link: { state: "pending" | "linked" } | { state: "failed"; error: string } | null;
}) {
  const name = `${target.label} · ${target.itemTitle}`;
  const message =
    link?.state === "linked"
      ? `Linked to ${name}.`
      : link?.state === "failed"
        ? `Saved, but not linked to ${name}: ${link.error}`
        : link?.state === "pending"
          ? `This article is for ${name}. Saving it links it there.`
          : `${target.itemTitle} already has an article, so this one won't be linked to it.`;
  return (
    <div
      role={link?.state === "failed" ? "alert" : "status"}
      className={`mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl px-4 py-3 text-sm ${
        link?.state === "failed" ? "bg-bg-raised text-danger" : "bg-accent-soft"
      }`}
    >
      <p>{message}</p>
      <Link href={`/admin/${target.section}/${target.itemId}`} className="row-action -my-2 no-underline">
        ← Back to {target.itemTitle}
      </Link>
    </div>
  );
}
