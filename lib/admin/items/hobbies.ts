import { z } from "zod";
import type { Tables, TablesInsert } from "@/lib/database.types";
import { IMAGE_STYLES, isImageStyle, LEARNING_CATEGORY, type ImageStyle } from "@/lib/hobbies";
import type { ImageUse } from "../image-rules";
import {
  baseFromRow,
  baseItemShape,
  baseToRow,
  EMPTY_BASE_ITEM,
  optionalLink,
  optionalText,
  type BaseItemFields,
  type FieldErrors,
  type ItemDefinition,
} from "./item-form";
import { ITEM_SECTIONS } from "./sections";

// Hobbies: what one hobby item holds (a coffee, a plant, something Ivan is
// learning…), its rules, and how it maps to the `hobby_items` table. A
// published item needs a category, and an image unless it's a text card.

const section = ITEM_SECTIONS.hobbies;

export const hobbySchema = z.object({
  ...baseItemShape(section),
  category: optionalText(60),
  imageStyle: z.enum(IMAGE_STYLES),
  caption: optionalText(120),
  subtitle: optionalText(120),
  note: optionalText(500),
  url: optionalLink,
});

export type HobbyFields = BaseItemFields & {
  category: string;
  imageStyle: ImageStyle;
  caption: string;
  subtitle: string;
  note: string;
  url: string;
};

export const EMPTY_HOBBY: HobbyFields = {
  ...EMPTY_BASE_ITEM,
  category: "",
  imageStyle: "photo",
  caption: "",
  subtitle: "",
  note: "",
  url: "",
};

/**
 * The database's `published_hobby_items_have_category`, plus: a photo or
 * cut-out card needs its image (it would be an empty card otherwise).
 */
export function hobbyPublishRules(data: z.output<typeof hobbySchema>): FieldErrors<HobbyFields> {
  const errors: FieldErrors<HobbyFields> = {};
  if (!data.category) errors.category = "A hobby item needs a category to be published.";
  if (data.imageStyle !== "none" && !data.imagePath) errors.imagePath = "Add an image, or choose the None style for a text card.";
  return errors;
}

/**
 * The category as stored: an existing category's spelling when it matches
 * ignoring case ("coffee" → "Coffee"), so cards don't split into two groups and
 * "learning" always reaches the Learning card.
 */
export function matchCategory(typed: string, existing: string[]): string {
  const category = typed.replace(/\s+/g, " ").trim();
  const known = [LEARNING_CATEGORY, ...existing];
  return known.find((k) => k.toLowerCase() === category.toLowerCase()) ?? category;
}

/** The category box's suggestions: the ones used (most used first, merged ignoring case), then Learning. */
export function categorySuggestions(used: string[]): string[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const category of used.map((c) => c.trim()).filter(Boolean)) {
    const entry = counts.get(category.toLowerCase());
    if (entry) entry.count++;
    else counts.set(category.toLowerCase(), { name: category, count: 1 });
  }
  const mostUsed = [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).map((e) => e.name);
  return counts.has(LEARNING_CATEGORY.toLowerCase()) ? mostUsed : [...mostUsed, LEARNING_CATEGORY];
}

/**
 * How the image is prepared and previewed for each card style. Photos fill a
 * card (2400 px, cropped square preview); cut-outs are objects (1200 px, shown
 * whole on a checkerboard) and must keep their transparency.
 */
export function hobbyImageSettings(style: ImageStyle): { use: ImageUse; frame: string; fit: "cover" | "contain"; keepTransparency: boolean } {
  return style === "cutout"
    ? { use: "cover", frame: "aspect-square max-w-72 checkerboard", fit: "contain", keepTransparency: true }
    : { use: "body", frame: "aspect-square max-w-72", fit: "cover", keepTransparency: false };
}

export function hobbyToRow(data: z.output<typeof hobbySchema>): Omit<TablesInsert<"hobby_items">, "status"> {
  return {
    ...baseToRow(data),
    category: data.category || null,
    image_style: data.imageStyle,
    caption: data.caption || null,
    subtitle: data.subtitle || null,
    note: data.note || null,
    url: data.url || null,
  };
}

export function hobbyFromRow(row: Tables<"hobby_items">): HobbyFields {
  return {
    ...baseFromRow(row),
    category: row.category ?? "",
    imageStyle: isImageStyle(row.image_style) ? row.image_style : "photo",
    caption: row.caption ?? "",
    subtitle: row.subtitle ?? "",
    note: row.note ?? "",
    url: row.url ?? "",
  };
}

export const hobbyDefinition: ItemDefinition<HobbyFields, z.output<typeof hobbySchema>> = {
  section,
  schema: hobbySchema,
  publishRules: hobbyPublishRules,
  toRow: hobbyToRow,
  empty: EMPTY_HOBBY,
};
