"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState, useTransition, type ReactNode } from "react";
import { Badge } from "@/components/badge";
import { ArticlePicker } from "@/components/admin/article-picker";
import { Field } from "@/components/admin/form-field";
import { ImageField } from "@/components/admin/image-field";
import { SaveBar } from "@/components/admin/save-bar";
import { TagInput } from "@/components/admin/tag-input";
import { removeBackup, useLocalBackup } from "@/components/admin/use-local-backup";
import {
  ITEM_LIMITS,
  normalizeBadge,
  validateItem,
  type BaseItemFields,
  type EditableItem,
  type FieldErrors,
  type ItemDefinition,
  type SaveItemInput,
  type SaveItemResult,
} from "@/lib/admin/items/item-form";
import { useNewItemUrl } from "@/lib/admin/editor-url";
import type { ArticleOption } from "@/lib/admin/items/article-options";
import { statusAfter, type PostStatus, type SaveIntent } from "@/lib/admin/post-form";
import { mediaUrl } from "@/lib/media";

// The form for one item, in any section. It owns everything the sections
// share: title, image, badges, "show on home", card size, the save bar, the
// local backup of unsaved changes, the leave-page warning and Ctrl+S. Each
// section passes its own fields in as `children`.

type Saved<F> = { id: string | null; updatedAt: string | null; status: PostStatus; fields: F };

/** What a section's own fields need from the form. */
export type ItemFormApi<F> = {
  fields: F;
  update: <K extends keyof F>(key: K, value: F[K]) => void;
  /** Changes several fields at once (e.g. a book's status and its dates). */
  patch: (changes: Partial<F>) => void;
  errors: FieldErrors<F>;
  /** id, aria-invalid and aria-describedby for a field's input. */
  fieldProps: (key: keyof F & string) => { id: string; "aria-invalid"?: true; "aria-describedby"?: string };
  /** A field reports an upload starting or ending ("snippet", true); saving waits for it. */
  setUploading: (name: string, busy: boolean) => void;
};

const WAIT_FOR_UPLOADS = "Wait for the upload to finish, then save.";

/** "Uploading the image…", or "Uploading 2 files…". */
function uploadingStatus(names: string[]): string {
  return names.length === 1 ? `Uploading the ${names[0]}…` : `Uploading ${names.length} files…`;
}

function sameFields<F>(a: F, b: F): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function timeNow(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ItemEditor<F extends BaseItemFields, D>({
  definition,
  item,
  action,
  badgeSuggestions,
  articles,
  imageFrame = "aspect-[16/10]",
  imageFit = "cover",
  header,
  children,
}: {
  definition: ItemDefinition<F, D>;
  /** null on the "new" page. */
  item: EditableItem<F> | null;
  action: (input: SaveItemInput<F>) => Promise<SaveItemResult<F>>;
  badgeSuggestions: string[];
  /** Every article, for the "linked article" picker. */
  articles: ArticleOption[];
  /** The image preview's shape and fit (book covers are tall and shown whole). */
  imageFrame?: string;
  imageFit?: "cover" | "contain";
  /** Above the title, e.g. the Reading form's Open Library search. */
  header?: (form: ItemFormApi<F>) => ReactNode;
  children: (form: ItemFormApi<F>) => ReactNode;
}) {
  const { section } = definition;
  const router = useRouter();
  // A "new" page reloaded after its first save (new#<id>) opens the item's own page.
  const { reopening, rememberNewId } = useNewItemUrl(item === null, (id) => `/admin/${section.key}/${id}`);
  const blank: Saved<F> = { id: null, updatedAt: null, status: "draft", fields: definition.empty };
  const [saved, setSaved] = useState<Saved<F>>(item ?? blank);
  const [fields, setFields] = useState<F>(item?.fields ?? definition.empty);
  const [errors, setErrors] = useState<FieldErrors<F>>({});
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [savingIntent, setSavingIntent] = useState<SaveIntent | null>(null);
  const [pending, startTransition] = useTransition();
  const [writingArticle, setWritingArticle] = useState(false);
  // Fields with an upload in progress ("image", "snippet"). Saving now would miss the new file.
  const [uploads, setUploads] = useState<string[]>([]);

  const published = saved.status === "published";
  const dirty = !sameFields(fields, saved.fields);
  const backupKey = (id: string | null) => `starfox:item-backup:${section.key}:${id ?? "new"}`;
  const backup = useLocalBackup(backupKey(saved.id), fields, dirty, (value) => sameFields(value, saved.fields));

  // Closing the tab, reloading or leaving the site with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update<K extends keyof F>(key: K, value: F[K]) {
    setFields((current) => ({ ...current, [key]: value }));
    if (errors[key as keyof F & string]) setErrors((current) => ({ ...current, [key]: undefined }));
    // "Saved at 14:32" is out of date once something changes; errors stay until dealt with.
    if (notice?.tone === "ok") setNotice(null);
  }

  function patch(changes: Partial<F>) {
    setFields((current) => ({ ...current, ...changes }));
    const touched = Object.keys(changes) as (keyof F & string)[];
    if (touched.some((key) => errors[key])) {
      setErrors((current) => ({ ...current, ...Object.fromEntries(touched.map((key) => [key, undefined])) }));
    }
    if (notice?.tone === "ok") setNotice(null);
  }

  function setUploading(name: string, busy: boolean) {
    setUploads((current) => (busy ? [...current.filter((n) => n !== name), name] : current.filter((n) => n !== name)));
    // Starting one makes "Saved at 14:32" out of date, as an edit does. Once one ends, "wait for
    // the upload" no longer applies (any other upload still shows in the status).
    setNotice((current) => {
      if (busy && current?.tone === "ok") return null;
      if (!busy && current?.text === WAIT_FOR_UPLOADS) return null;
      return current;
    });
  }

  function restoreBackup() {
    const backedUp = backup.restore();
    if (!backedUp) return;
    setFields({ ...definition.empty, ...backedUp }); // backups from before a field existed lack it
    setNotice({ tone: "ok", text: "Restored. Save to keep it." });
  }

  /** `after` runs once the save succeeded, with the item's id (used by "Write the article"). */
  function save(intent: SaveIntent, { addAnother = false, after }: { addAnother?: boolean; after?: (id: string) => void } = {}) {
    if (pending) return;
    if (uploads.length > 0) {
      setWritingArticle(false);
      setNotice({ tone: "error", text: WAIT_FOR_UPLOADS });
      return;
    }
    const checked = validateItem(definition.schema, definition.publishRules, fields, statusAfter(intent, saved.status));
    if (!checked.ok) {
      setWritingArticle(false);
      setErrors(checked.fieldErrors);
      setNotice({ tone: "error", text: "Check the highlighted fields." });
      const first = Object.keys(checked.fieldErrors)[0];
      document.getElementById(`item-${first}`)?.focus();
      return;
    }

    const submitted = fields;
    setErrors({});
    setNotice(null);
    setSavingIntent(intent);
    startTransition(async () => {
      const result = await action({ id: saved.id, updatedAt: saved.updatedAt, status: saved.status, intent, fields: submitted });
      setSavingIntent(null);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setNotice({ tone: "error", text: result.error });
        setWritingArticle(false);
        return;
      }

      const newHref = `/admin/${section.key}/new`;
      if (addAnother) {
        removeBackup(backupKey(null));
        if (item === null) {
          // Already on the "new" page: just clear the form.
          setSaved(blank);
          setFields(definition.empty);
          setNotice({ tone: "ok", text: `Saved “${submitted.title.trim()}”. Start the next one.` });
          window.history.replaceState(null, "", newHref);
          window.scrollTo({ top: 0 });
        } else {
          router.push(newHref);
        }
        return;
      }

      // The cleaned-up values (trimmed, tidied chips) have the same shape as the form's.
      const cleaned = checked.data as unknown as F;
      setSaved({ id: result.id, updatedAt: result.updatedAt, status: result.status, fields: cleaned });
      setFields((current) => (current === submitted ? cleaned : current)); // keep anything typed while saving
      const verb = intent === "publish" ? "Published" : intent === "unpublish" ? "Unpublished" : "Saved";
      setNotice({ tone: "ok", text: `${verb} at ${timeNow()}.` });
      if (saved.id === null) {
        removeBackup(backupKey(null)); // from now on it's backed up under its own id
        rememberNewId(result.id); // new#<id>, not /<id>: see lib/admin/editor-url.ts
      }
      after?.(result.id);
    });
  }

  /**
   * "Write the article": the new article links back to this item when it's
   * first saved, so the item must exist (and its changes be kept) first.
   */
  function writeArticle() {
    const open = (id: string) => router.push(`/admin/writing/new?for=${section.key}:${id}`);
    setWritingArticle(true);
    if (saved.id && !dirty) return open(saved.id);
    save("save", { after: open });
  }

  // Ctrl/⌘+S saves from anywhere on the page.
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

  const fieldProps = (key: keyof F & string) => ({
    id: `item-${key}`,
    "aria-invalid": errors[key] ? (true as const) : undefined,
    "aria-describedby": errors[key] ? `item-${key}-error` : undefined,
  });
  const fieldError = (key: keyof BaseItemFields & keyof F & string) => ({ error: errors[key], errorId: `item-${key}-error` });

  if (reopening) return <p className="py-6 text-fg-muted">Opening the saved {section.singular}…</p>;

  return (
    // autoComplete="off": Firefox would otherwise carry controls' state (e.g. a button enabled
    // again after saving) over a reload onto whatever control is in that place in the new
    // HTML, removing a `disabled` the server rendered. See types/react-button-autocomplete.d.ts.
    <form noValidate autoComplete="off" onSubmit={(e) => e.preventDefault()} className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link href={`/admin/${section.key}`} className="row-action -ml-3 no-underline">
          ← All {section.label.toLowerCase()}
        </Link>
        <Badge toneKey={published ? "read" : "learning"}>{published ? "Published" : "Draft"}</Badge>
      </div>

      {backup.offer && (
        <div role="alert" className="mb-6 rounded-xl bg-bg-raised px-4 py-3 text-sm">
          <p>
            Unsaved changes from {new Date(backup.offer.savedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} were
            found on this device.
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
        {header?.({ fields, update, patch, errors, fieldProps, setUploading })}

        <Field label="Title" htmlFor="item-title" {...fieldError("title")}>
          <input
            {...fieldProps("title")}
            value={fields.title}
            onChange={(e) => update("title", e.target.value as F["title"])}
            maxLength={ITEM_LIMITS.title}
            autoFocus={item === null}
            className="field font-serif text-2xl leading-tight"
          />
        </Field>

        <Field label="Image" optional htmlFor="item-imagePath" {...fieldError("imagePath")}>
          <ImageField
            id="item-imagePath"
            imageUrl={fields.imagePath ? mediaUrl(fields.imagePath) : ""}
            onAdded={(image) => update("imagePath", image.path as F["imagePath"])}
            onRemove={() => update("imagePath", "" as F["imagePath"])}
            use={section.imageUse}
            folder={section.folder}
            frameClassName={imageFrame}
            fit={imageFit}
            describedBy={errors.imagePath ? "item-imagePath-error" : undefined}
            onBusyChange={(busy) => setUploading("image", busy)}
          />
        </Field>

        {fields.imagePath && (
          <Field
            label="Image description"
            optional
            htmlFor="item-imageAlt"
            {...fieldError("imageAlt")}
            hint="What the image shows, for people who can't see it. Leave empty if it's only decoration."
          >
            <input
              {...fieldProps("imageAlt")}
              value={fields.imageAlt}
              onChange={(e) => update("imageAlt", e.target.value as F["imageAlt"])}
              maxLength={ITEM_LIMITS.imageAlt}
              className="field"
            />
          </Field>
        )}

        {children({ fields, update, patch, errors, fieldProps, setUploading })}

        <Field
          label="Linked article"
          optional
          htmlFor="item-postId"
          {...fieldError("postId")}
          hint="The review or write-up about it. The card links there once the article is published."
        >
          <ArticlePicker
            id="item-postId"
            value={fields.postId}
            onChange={(postId) => update("postId", postId as F["postId"])}
            options={articles}
            section={section.key}
            itemId={saved.id}
            onWrite={writeArticle}
            writing={writingArticle}
            describedBy={errors.postId ? "item-postId-error" : undefined}
          />
        </Field>

        <Field label="Badges" optional htmlFor="item-badges" {...fieldError("badges")} hint="Short labels on the card, like SOLO PROJECT.">
          <TagInput
            id="item-badges"
            tags={fields.badges}
            onChange={(badges) => update("badges", badges as F["badges"])}
            suggestions={badgeSuggestions}
            normalize={normalizeBadge}
            max={ITEM_LIMITS.badges}
            invalid={Boolean(errors.badges)}
            describedBy={errors.badges ? "item-badges-error" : undefined}
          />
        </Field>

        <fieldset className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <legend className="sr-only">Home page and card</legend>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={fields.showOnHome}
              onChange={(e) => update("showOnHome", e.target.checked as F["showOnHome"])}
              className="size-5 accent-accent"
            />
            Show on home
          </label>
          <div className="flex items-center gap-3 text-sm">
            <span id="item-cardSize-label" className="font-medium">
              Card size
            </span>
            <div role="group" aria-labelledby="item-cardSize-label" className="flex gap-1 rounded-lg bg-bg-raised p-1">
              {(["small", "wide"] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={fields.cardSize === size}
                  onClick={() => update("cardSize", size as F["cardSize"])}
                  className="min-h-9 cursor-pointer rounded-md px-3 text-fg-muted hover:text-fg aria-pressed:bg-bg aria-pressed:text-fg aria-pressed:shadow-sm"
                >
                  {size === "small" ? "Small" : "Wide"}
                </button>
              ))}
            </div>
          </div>
        </fieldset>
      </div>

      <SaveBar
        status={notice?.text ?? (uploads.length > 0 ? uploadingStatus(uploads) : dirty ? "Unsaved changes" : saved.id ? "All changes saved" : "")}
        isError={notice?.tone === "error"}
        published={published}
        pending={pending}
        savingIntent={savingIntent}
        onSave={(intent, addAnother) => save(intent, { addAnother })}
      />
    </form>
  );
}
