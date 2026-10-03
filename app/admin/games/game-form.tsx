"use client";

import { Field } from "@/components/admin/form-field";
import { ItemEditor } from "@/components/admin/item-editor";
import { RatingButtons } from "@/components/admin/rating-buttons";
import type { ArticleOption } from "@/lib/admin/items/article-options";
import { gameDefinition, withPlayStatus, type GameFields } from "@/lib/admin/items/games";
import type { EditableItem } from "@/lib/admin/items/item-form";
import { localToday } from "@/lib/format";
import { PLAY_STATUS_LABELS, PLAY_STATUSES } from "@/lib/games";
import { saveGame } from "./actions";

// The Games form: the shared item fields (the image is a screenshot, shown
// 16:9 like a project's), plus what a game card shows. A game links to Ivan's
// review, which it needs before it can be published.
export function GameForm({
  game,
  badgeSuggestions,
  platformSuggestions,
  articles,
}: {
  game: EditableItem<GameFields> | null;
  badgeSuggestions: string[];
  platformSuggestions: string[];
  articles: ArticleOption[];
}) {
  return (
    <ItemEditor definition={gameDefinition} item={game} action={saveGame} badgeSuggestions={badgeSuggestions} articles={articles}>
      {({ fields, update, patch, errors, fieldProps }) => {
        const error = (key: keyof GameFields & string) => ({ error: errors[key], errorId: `item-${key}-error` });

        return (
          <>
            <div>
              <span id="item-playStatus-label" className="mb-1.5 block text-sm font-medium">
                Status
              </span>
              <div role="group" aria-labelledby="item-playStatus-label" className="inline-flex gap-1 rounded-lg bg-bg-raised p-1 text-sm">
                {PLAY_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={fields.playStatus === status}
                    // Finishing fills "Finished on" with today, if it's still empty.
                    onClick={() => patch(withPlayStatus(fields, status, localToday()))}
                    className="min-h-9 cursor-pointer rounded-md px-3 font-mono text-xs tracking-wide text-fg-muted hover:text-fg aria-pressed:bg-bg aria-pressed:text-fg aria-pressed:shadow-sm"
                  >
                    {PLAY_STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Platform" optional htmlFor="item-platform" {...error("platform")}>
                <input
                  {...fieldProps("platform")}
                  list="item-platform-options"
                  value={fields.platform}
                  onChange={(e) => update("platform", e.target.value)}
                  maxLength={100}
                  className="field"
                />
                <datalist id="item-platform-options">
                  {platformSuggestions.map((platform) => (
                    <option key={platform} value={platform} />
                  ))}
                </datalist>
              </Field>
              <Field label="Hours played" optional htmlFor="item-hoursPlayed" {...error("hoursPlayed")}>
                <input
                  {...fieldProps("hoursPlayed")}
                  inputMode="decimal"
                  value={fields.hoursPlayed}
                  onChange={(e) => update("hoursPlayed", e.target.value)}
                  placeholder="e.g. 12.5"
                  maxLength={9}
                  className="field"
                />
              </Field>
            </div>

            <Field label="Rating" optional htmlFor="item-rating" {...error("rating")}>
              <RatingButtons
                id="item-rating"
                value={fields.rating}
                onChange={(rating) => update("rating", rating)}
                describedBy={errors.rating ? "item-rating-error" : undefined}
              />
            </Field>

            <Field label="Finished on" optional htmlFor="item-finishedOn" {...error("finishedOn")} hint="Filled in with today when you mark the game finished.">
              <input
                {...fieldProps("finishedOn")}
                type="date"
                value={fields.finishedOn}
                onChange={(e) => update("finishedOn", e.target.value)}
                className="field sm:w-56"
              />
            </Field>
          </>
        );
      }}
    </ItemEditor>
  );
}
