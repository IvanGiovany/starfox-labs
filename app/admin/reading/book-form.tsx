"use client";

import { Field } from "@/components/admin/form-field";
import { ItemEditor } from "@/components/admin/item-editor";
import { StarRating } from "@/components/admin/star-rating";
import type { ArticleOption } from "@/lib/admin/items/article-options";
import { bookDefinition, withReadingStatus, type BookFields } from "@/lib/admin/items/books";
import type { EditableItem } from "@/lib/admin/items/item-form";
import { localToday } from "@/lib/format";
import { READING_STATUS_LABELS, READING_STATUSES } from "@/lib/reading";
import { saveBook } from "./actions";

// The Reading form: the shared item fields, plus what a book card shows.
// The cover is stored at 1200 px and shown whole in a tall frame.
export function BookForm({
  book,
  badgeSuggestions,
  articles,
}: {
  book: EditableItem<BookFields> | null;
  badgeSuggestions: string[];
  articles: ArticleOption[];
}) {
  return (
    <ItemEditor
      definition={bookDefinition}
      item={book}
      action={saveBook}
      badgeSuggestions={badgeSuggestions}
      articles={articles}
      imageFrame="aspect-[2/3] max-w-48"
      imageFit="contain"
    >
      {({ fields, update, patch, errors, fieldProps }) => {
        const text = (key: "author" | "note" | "url" | "isbn" | "publishedYear" | "pageCount") => ({
          ...fieldProps(key),
          value: fields[key],
          onChange: (e: { target: { value: string } }) => update(key, e.target.value),
        });
        const error = (key: keyof BookFields & string) => ({ error: errors[key], errorId: `item-${key}-error` });

        return (
          <>
            <Field label="Author" optional htmlFor="item-author" {...error("author")}>
              <input {...text("author")} maxLength={200} className="field" />
            </Field>

            <div>
              <span id="item-readingStatus-label" className="mb-1.5 block text-sm font-medium">
                Reading status
              </span>
              <div role="group" aria-labelledby="item-readingStatus-label" className="inline-flex gap-1 rounded-lg bg-bg-raised p-1 text-sm">
                {READING_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={fields.readingStatus === status}
                    // Starting or finishing fills that date with today, if it's still empty.
                    onClick={() => patch(withReadingStatus(fields, status, localToday()))}
                    className="min-h-9 cursor-pointer rounded-md px-3 font-mono text-xs tracking-wide text-fg-muted hover:text-fg aria-pressed:bg-bg aria-pressed:text-fg aria-pressed:shadow-sm"
                  >
                    {READING_STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Started on" optional htmlFor="item-startedOn" {...error("startedOn")}>
                <input {...fieldProps("startedOn")} type="date" value={fields.startedOn} onChange={(e) => update("startedOn", e.target.value)} className="field" />
              </Field>
              <Field label="Finished on" optional htmlFor="item-finishedOn" {...error("finishedOn")}>
                <input {...fieldProps("finishedOn")} type="date" value={fields.finishedOn} onChange={(e) => update("finishedOn", e.target.value)} className="field" />
              </Field>
            </div>

            <Field label="Rating" optional htmlFor="item-rating" {...error("rating")}>
              <StarRating
                id="item-rating"
                value={fields.rating}
                onChange={(rating) => update("rating", rating)}
                describedBy={errors.rating ? "item-rating-error" : undefined}
              />
            </Field>

            <Field label="Note" optional htmlFor="item-note" {...error("note")} hint="A line about the book, for the card.">
              <textarea {...text("note")} maxLength={500} rows={2} className="field field-sizing-content min-h-20 resize-y" />
            </Field>

            <Field label="Link" optional htmlFor="item-url" {...error("url")} hint="Where to find the book, if not via an article.">
              <input {...text("url")} type="url" inputMode="url" placeholder="https://" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="field" />
            </Field>

            <div className="grid gap-6 sm:grid-cols-3">
              <Field label="ISBN" optional htmlFor="item-isbn" {...error("isbn")}>
                <input {...text("isbn")} inputMode="text" autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={20} className="field font-mono" />
              </Field>
              <Field label="Year" optional htmlFor="item-publishedYear" {...error("publishedYear")}>
                <input {...text("publishedYear")} inputMode="numeric" pattern="[0-9]*" maxLength={4} className="field" />
              </Field>
              <Field label="Pages" optional htmlFor="item-pageCount" {...error("pageCount")}>
                <input {...text("pageCount")} inputMode="numeric" pattern="[0-9]*" maxLength={6} className="field" />
              </Field>
            </div>
          </>
        );
      }}
    </ItemEditor>
  );
}
