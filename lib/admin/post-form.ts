import { z } from "zod";
import { youtubeId } from "@/lib/youtube";

// The article editor's rules, shared by the form (instant feedback) and the
// server action (the check that counts). The database enforces the important
// ones a third time: slug format, unique slug, and "published needs a body".

/** Same pattern as the `posts.slug` check in the database. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// `preview`: the longest body (in characters) the live preview renders, about 80,000 words.
export const LIMITS = { title: 200, slug: 100, summary: 300, tags: 10, tag: 30, preview: 500_000 } as const;

/** "Café & Next.js 16!" → "cafe-next-js-16". Returns "" if nothing usable is left. */
export function slugify(text: string, maxLength: number = LIMITS.slug): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, maxLength)
    .replace(/^-+|-+$/g, "");
}

/** Tags follow the slug rules too, since they end up in URLs (`/writing?tag=nextjs`). */
export function normalizeTag(text: string): string {
  return slugify(text, LIMITS.tag);
}

/**
 * The first sentence of a markdown body as plain text, used as the summary
 * when none is given. Skips headings, code blocks, images and HTML; keeps
 * link text. Long sentences are cut at a word boundary.
 */
export function firstSentence(markdown: string, maxLength = 200): string {
  const text = markdown
    .replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, "") // fenced code blocks
    .replace(/^#{1,6}\s.*$/gm, "") // headings
    .replace(/<[^>]+>/g, "") // HTML tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links: keep the text
    .replace(/^\s*(?:>\s*)+|^\s*(?:[-*+]|\d+\.)\s+/gm, "") // quote and list markers
    .replace(/[*_~`]+/g, "") // emphasis and inline code marks
    .replace(/\s+/g, " ")
    .trim();

  const sentence = text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;
  if (sentence.length <= maxLength) return sentence;
  const cut = sentence.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export const postFieldsSchema = z.object({
  title: z.string().trim().min(1, "Add a title.").max(LIMITS.title, `Keep the title under ${LIMITS.title} characters.`),
  // Empty is allowed: the server then makes one from the title.
  slug: z
    .string()
    .trim()
    .max(LIMITS.slug, `Keep the address under ${LIMITS.slug} characters.`)
    .refine((slug) => slug === "" || SLUG_PATTERN.test(slug), "Use lowercase letters, numbers and single hyphens."),
  // Empty is allowed: the server then uses the body's first sentence.
  summary: z.string().trim().max(LIMITS.summary, `Keep the summary under ${LIMITS.summary} characters.`),
  tags: z
    .array(z.string())
    .transform((tags) => [...new Set(tags.map(normalizeTag).filter(Boolean))])
    .refine((tags) => tags.length <= LIMITS.tags, `Use at most ${LIMITS.tags} tags.`),
  youtubeUrl: z
    .string()
    .trim()
    .refine((url) => url === "" || youtubeId(url) !== null, "That doesn't look like a YouTube video link."),
  bodyMd: z.string(),
});

/** What the form holds (before cleanup). */
export type PostFields = z.input<typeof postFieldsSchema>;
export type PostFieldErrors = Partial<Record<keyof PostFields, string>>;

export type PostStatus = "draft" | "published";

/** The editor's buttons: Save draft / Update keep the status, the others change it. */
export type SaveIntent = "save" | "publish" | "unpublish";

export function statusAfter(intent: SaveIntent, current: PostStatus): PostStatus {
  return intent === "publish" ? "published" : intent === "unpublish" ? "draft" : current;
}

/** An existing article as the editor loads it. */
export type EditablePost = { id: string; updatedAt: string; status: PostStatus; fields: PostFields };

/**
 * Validates the form for the status the post will have after saving.
 * Drafts need only a title; published articles also need a body.
 */
export function validatePost(
  fields: PostFields,
  status: PostStatus,
): { ok: true; data: z.output<typeof postFieldsSchema> } | { ok: false; fieldErrors: PostFieldErrors } {
  const result = postFieldsSchema.safeParse(fields);
  const fieldErrors: PostFieldErrors = {};

  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof PostFields;
      fieldErrors[key] ??= issue.message; // first problem per field is enough
    }
  }
  if (status === "published" && fields.bodyMd.trim() === "") {
    fieldErrors.bodyMd ??= "Write something before publishing.";
  }

  if (!result.success || Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, data: result.data };
}
