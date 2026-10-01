"use client";

import { Field } from "@/components/admin/form-field";
import { ItemEditor } from "@/components/admin/item-editor";
import { SnippetField } from "@/components/admin/snippet-field";
import type { ArticleOption } from "@/lib/admin/items/article-options";
import type { EditableItem } from "@/lib/admin/items/item-form";
import { TRACK_LINKS, trackDefinition, type TrackFields, type TrackLinkKey } from "@/lib/admin/items/tracks";
import { saveTrack } from "./actions";

// The Music form: the shared item fields, plus a song's audio snippet and
// where to hear it. Covers are square, stored at 1200 px and shown whole.

const LINK_PLACEHOLDERS: Record<TrackLinkKey, string> = {
  spotify: "https://open.spotify.com/track/…",
  soundcloud: "https://soundcloud.com/…",
  bandcamp: "https://….bandcamp.com/track/…",
  youtube: "https://youtu.be/…",
  apple: "https://music.apple.com/…",
};

/** Props for a link input: the URL keyboard, no autocorrect. */
const linkInput = { type: "url", inputMode: "url", autoCapitalize: "none", autoCorrect: "off", spellCheck: false } as const;

export function TrackForm({
  track,
  badgeSuggestions,
  articles,
}: {
  track: EditableItem<TrackFields> | null;
  badgeSuggestions: string[];
  articles: ArticleOption[];
}) {
  return (
    <ItemEditor
      definition={trackDefinition}
      item={track}
      action={saveTrack}
      badgeSuggestions={badgeSuggestions}
      articles={articles}
      imageFrame="aspect-square max-w-64"
      imageFit="contain"
    >
      {({ fields, update, errors, fieldProps, setUploading }) => {
        const error = (key: keyof TrackFields & string) => ({ error: errors[key], errorId: `item-${key}-error` });

        return (
          <>
            <div>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
                <input
                  {...fieldProps("inProgress")}
                  type="checkbox"
                  checked={fields.inProgress}
                  onChange={(e) => update("inProgress", e.target.checked)}
                  aria-describedby="item-inProgress-hint"
                  className="size-5 accent-accent"
                />
                Still in progress
              </label>
              <p id="item-inProgress-hint" className="text-sm text-fg-muted">
                Shows as “Now producing” on home and can be published before its snippet and article exist. The Music page lists
                only finished songs.
              </p>
            </div>

            <Field label="Released on" optional htmlFor="item-releasedOn" {...error("releasedOn")}>
              <input
                {...fieldProps("releasedOn")}
                type="date"
                value={fields.releasedOn}
                onChange={(e) => update("releasedOn", e.target.value)}
                className="field sm:w-56"
              />
            </Field>

            <Field
              label="Audio snippet"
              optional={fields.inProgress}
              htmlFor="item-snippetPath"
              {...error("snippetPath")}
              hint="20–30 seconds of the song, played on its article. Needed to publish a finished song."
            >
              <SnippetField
                id="item-snippetPath"
                path={fields.snippetPath}
                onAdded={(snippet) => update("snippetPath", snippet.path)}
                onRemove={() => update("snippetPath", "")}
                describedBy={errors.snippetPath ? "item-snippetPath-error" : undefined}
                onBusyChange={(busy) => setUploading("snippet", busy)}
              />
            </Field>

            <Field
              label="Full track"
              optional
              htmlFor="item-fullTrackUrl"
              {...error("fullTrackUrl")}
              hint="Where to hear the whole song: the article's “Listen to the full track” link."
            >
              <input
                {...fieldProps("fullTrackUrl")}
                {...linkInput}
                value={fields.fullTrackUrl}
                onChange={(e) => update("fullTrackUrl", e.target.value)}
                placeholder="https://"
                className="field"
              />
            </Field>

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">
                Also on <span className="font-normal text-fg-muted">(optional)</span>
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {(Object.keys(TRACK_LINKS) as TrackLinkKey[]).map((key) => {
                  const { field, label } = TRACK_LINKS[key];
                  return (
                    <Field key={key} label={label} htmlFor={`item-${field}`} {...error(field)}>
                      <input
                        {...fieldProps(field)}
                        {...linkInput}
                        value={fields[field]}
                        onChange={(e) => update(field, e.target.value)}
                        placeholder={LINK_PLACEHOLDERS[key]}
                        className="field"
                      />
                    </Field>
                  );
                })}
              </div>
            </fieldset>

            <Field label="Note" optional htmlFor="item-note" {...error("note")} hint="A line about the song, for its card.">
              <textarea
                {...fieldProps("note")}
                value={fields.note}
                onChange={(e) => update("note", e.target.value)}
                maxLength={500}
                rows={2}
                className="field field-sizing-content min-h-20 resize-y"
              />
            </Field>
          </>
        );
      }}
    </ItemEditor>
  );
}
