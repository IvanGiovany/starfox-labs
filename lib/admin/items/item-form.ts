import { z } from "zod";
import { isMediaPath } from "@/lib/media";
import type { PostStatus, SaveIntent } from "../post-form";
import type { ItemSection } from "./sections";

// The fields every item has, whatever its section: title, image, badges, the
// linked article, "show on home" and card size. Shared by the forms (instant
// feedback) and the server (the check that counts); the database enforces the
// important rules a third time.

export const ITEM_LIMITS = { title: 200, imageAlt: 300, badges: 4, badge: 24, url: 2048, text: 2000 } as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Badges keep their wording (they're labels like "NOW BREWING" or "SOLO
 * PROJECT", shown in capitals by the Badge component); only spacing is tidied.
 */
export function normalizeBadge(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, ITEM_LIMITS.badge);
}

/** Chips such as badges or a project's stack: tidied, no blanks, no duplicates (ignoring case). */
export function chipList(normalize: (text: string) => string, max: number, what: string) {
  return z
    .array(z.string())
    .transform((items) => {
      const kept: string[] = [];
      for (const item of items.map(normalize)) {
        if (item && !kept.some((k) => k.toLowerCase() === item.toLowerCase())) kept.push(item);
      }
      return kept;
    })
    .refine((items) => items.length <= max, `Use at most ${max} ${what}.`);
}

/** An optional http(s) link, like the database's `~ '^https?://'` checks. */
export const optionalLink = z
  .string()
  .trim()
  .max(ITEM_LIMITS.url, "That link is too long.")
  .refine((url) => url === "" || (/^https?:\/\/\S+$/i.test(url) && URL.canParse(url)), "Use a full link starting with https://.");

/** "2026-02-28" is a real day; "2026-02-30" isn't (JavaScript would quietly turn it into March 2). */
function isRealDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

/** An optional date from a date input ("2026-10-01"). */
export const optionalDate = z.string().refine((date) => date === "" || isRealDate(date), "Pick a valid date.");

/** Optional free text. */
export const optionalText = (max: number = ITEM_LIMITS.text) => z.string().trim().max(max, `Keep this under ${max} characters.`);

/** The shared fields, with images restricted to the section's own media folder. */
export function baseItemShape(section: ItemSection) {
  return {
    title: z.string().trim().min(1, "Add a title.").max(ITEM_LIMITS.title, `Keep the title under ${ITEM_LIMITS.title} characters.`),
    imagePath: z
      .string()
      .trim()
      .refine((path) => path === "" || isMediaPath(path, section.folder), "Add the image here (upload or import it), so we keep our own copy."),
    imageAlt: optionalText(ITEM_LIMITS.imageAlt),
    badges: chipList(normalizeBadge, ITEM_LIMITS.badges, "badges"),
    postId: z.string().refine((id) => id === "" || UUID.test(id), "Pick an article from the list."),
    showOnHome: z.boolean(),
    cardSize: z.enum(["small", "wide"]),
  };
}

export type BaseItemFields = {
  title: string;
  imagePath: string;
  imageAlt: string;
  badges: string[];
  postId: string;
  showOnHome: boolean;
  cardSize: "small" | "wide";
};

export const EMPTY_BASE_ITEM: BaseItemFields = {
  title: "",
  imagePath: "",
  imageAlt: "",
  badges: [],
  postId: "",
  showOnHome: false,
  cardSize: "small",
};

/** The shared columns, as stored. Empty strings become null. */
export function baseToRow(data: BaseItemFields) {
  return {
    title: data.title,
    image_path: data.imagePath || null,
    image_alt: data.imageAlt || null,
    badges: data.badges,
    post_id: data.postId || null,
    show_on_home: data.showOnHome,
    card_size: data.cardSize,
  };
}

type BaseRow = {
  title: string;
  image_path: string | null;
  image_alt: string | null;
  badges: string[];
  post_id: string | null;
  show_on_home: boolean;
  card_size: string;
};

export function baseFromRow(row: BaseRow): BaseItemFields {
  return {
    title: row.title,
    imagePath: row.image_path ?? "",
    imageAlt: row.image_alt ?? "",
    badges: row.badges,
    postId: row.post_id ?? "",
    showOnHome: row.show_on_home,
    cardSize: row.card_size === "wide" ? "wide" : "small",
  };
}

export type FieldErrors<F> = Partial<Record<keyof F & string, string>>;

export type SaveItemInput<F> = {
  /** null for a new item. */
  id: string | null;
  /** The `updated_at` the form loaded, so a newer save elsewhere is never overwritten. */
  updatedAt: string | null;
  /** The status the form shows now; "save" keeps it. */
  status: PostStatus;
  intent: SaveIntent;
  fields: F;
};

export type SaveItemResult<F> =
  | { ok: true; id: string; status: PostStatus; updatedAt: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors<F> };

/** An existing item as its form loads it. */
export type EditableItem<F> = { id: string; updatedAt: string; status: PostStatus; fields: F };

/**
 * Everything the shared list, form and save helper need to know about one
 * section. F is what the form holds; D is the same after validation.
 */
export type ItemDefinition<F extends BaseItemFields, D> = {
  section: ItemSection;
  schema: z.ZodType<D, F>;
  /** The section's extra "to publish" rules, e.g. a project needs a link. */
  publishRules?: (data: D) => FieldErrors<F>;
  /** Validated fields → the section's columns (typed against its own table in its file). */
  toRow: (data: D) => Record<string, unknown>;
  empty: F;
};

/**
 * Validates an item form for the status it will have after saving. `publishRules`
 * adds the section's "to publish" requirements (e.g. a project needs a link).
 */
export function validateItem<S extends z.ZodTypeAny>(
  schema: S,
  publishRules: ((data: z.output<S>) => FieldErrors<z.input<S>>) | undefined,
  fields: z.input<S>,
  status: PostStatus,
): { ok: true; data: z.output<S> } | { ok: false; fieldErrors: FieldErrors<z.input<S>> } {
  const result = schema.safeParse(fields);
  const fieldErrors: Record<string, string> = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message; // the first problem per field is enough
    }
    return { ok: false, fieldErrors: fieldErrors as FieldErrors<z.input<S>> };
  }
  if (status === "published" && publishRules) {
    const publishErrors = publishRules(result.data);
    if (Object.keys(publishErrors).length > 0) return { ok: false, fieldErrors: publishErrors };
  }
  return { ok: true, data: result.data };
}
