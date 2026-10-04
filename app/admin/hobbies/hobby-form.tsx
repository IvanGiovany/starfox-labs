"use client";

import { Field } from "@/components/admin/form-field";
import { ItemEditor } from "@/components/admin/item-editor";
import type { ArticleOption } from "@/lib/admin/items/article-options";
import { hobbyDefinition, hobbyImageSettings, matchCategory, type HobbyFields } from "@/lib/admin/items/hobbies";
import type { EditableItem } from "@/lib/admin/items/item-form";
import { IMAGE_STYLE_LABELS, IMAGE_STYLES, LEARNING_CATEGORY } from "@/lib/hobbies";
import { saveHobby } from "./actions";

// The Hobbies form: the shared item fields, plus a category and the card's
// style. The image follows the style: a photo fills the card (2400 px), a
// cut-out keeps its transparent background (1200 px, shown on a checkerboard).

const STYLE_HINTS = {
  photo: "The picture fills the card, with the caption in its corner.",
  cutout: "An object on a transparent background (a PNG or WebP cut-out).",
  none: "A text card: the name in large type, with its badges.",
} as const;

export function HobbyForm({
  hobby,
  badgeSuggestions,
  categorySuggestions,
  articles,
}: {
  hobby: EditableItem<HobbyFields> | null;
  badgeSuggestions: string[];
  categorySuggestions: string[];
  articles: ArticleOption[];
}) {
  return (
    <ItemEditor
      definition={hobbyDefinition}
      item={hobby}
      action={saveHobby}
      badgeSuggestions={badgeSuggestions}
      articles={articles}
      imageFor={(fields) => hobbyImageSettings(fields.imageStyle)}
    >
      {({ fields, update, errors, fieldProps }) => {
        const text = (key: "caption" | "subtitle" | "note" | "url") => ({
          ...fieldProps(key),
          value: fields[key],
          onChange: (e: { target: { value: string } }) => update(key, e.target.value),
        });
        const error = (key: keyof HobbyFields & string) => ({ error: errors[key], errorId: `item-${key}-error` });

        return (
          <>
            <Field
              label="Category"
              htmlFor="item-category"
              {...error("category")}
              hint={
                <>
                  Needed to publish. Use <em>{LEARNING_CATEGORY}</em> for what you&rsquo;re learning now: it shows on the home page&rsquo;s
                  Learning card.
                </>
              }
            >
              <input
                {...fieldProps("category")}
                list="item-category-options"
                value={fields.category}
                onChange={(e) => update("category", e.target.value)}
                // "coffee" becomes "Coffee" when that category exists (the server does the same).
                onBlur={(e) => update("category", matchCategory(e.target.value, categorySuggestions))}
                maxLength={60}
                className="field sm:w-72"
              />
              <datalist id="item-category-options">
                {categorySuggestions.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </Field>

            <div>
              <span id="item-imageStyle-label" className="mb-1.5 block text-sm font-medium">
                Card style
              </span>
              <div role="group" aria-labelledby="item-imageStyle-label" aria-describedby="item-imageStyle-hint" className="inline-flex gap-1 rounded-lg bg-bg-raised p-1 text-sm">
                {IMAGE_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    aria-pressed={fields.imageStyle === style}
                    onClick={() => update("imageStyle", style)}
                    className="min-h-9 cursor-pointer rounded-md px-3 font-mono text-xs tracking-wide text-fg-muted hover:text-fg aria-pressed:bg-bg aria-pressed:text-fg aria-pressed:shadow-sm"
                  >
                    {IMAGE_STYLE_LABELS[style]}
                  </button>
                ))}
              </div>
              <p id="item-imageStyle-hint" className="mt-1.5 text-sm text-fg-muted">
                {STYLE_HINTS[fields.imageStyle]}
              </p>
            </div>

            {/* Only photo cards show a caption; the text is kept if the style changes and back. */}
            {fields.imageStyle === "photo" && (
              <Field label="Caption" optional htmlFor="item-caption" {...error("caption")} hint="White text in the photo's corner.">
                <input {...text("caption")} maxLength={120} className="field" />
              </Field>
            )}

            <Field label="Subtitle" optional htmlFor="item-subtitle" {...error("subtitle")} hint="e.g. the origin and roaster of a coffee.">
              <input {...text("subtitle")} maxLength={120} className="field" />
            </Field>

            <Field label="Note" optional htmlFor="item-note" {...error("note")} hint="A line about it, for the card.">
              <textarea {...text("note")} maxLength={500} rows={2} className="field field-sizing-content min-h-20 resize-y" />
            </Field>

            <Field label="Link" optional htmlFor="item-url" {...error("url")} hint="Where the card goes. Used instead of the linked article.">
              <input {...text("url")} type="url" inputMode="url" placeholder="https://" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="field" />
            </Field>
          </>
        );
      }}
    </ItemEditor>
  );
}
