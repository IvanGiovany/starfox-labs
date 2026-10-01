"use client";

import { Field } from "@/components/admin/form-field";
import { ItemEditor } from "@/components/admin/item-editor";
import { TagInput } from "@/components/admin/tag-input";
import type { ArticleOption } from "@/lib/admin/items/article-options";
import type { EditableItem } from "@/lib/admin/items/item-form";
import { normalizeStackEntry, projectDefinition, type ProjectFields } from "@/lib/admin/items/projects";
import { saveProject } from "./actions";

// The Projects form: the shared item fields, plus what a project card shows.
export function ProjectForm({
  project,
  badgeSuggestions,
  stackSuggestions,
  articles,
}: {
  project: EditableItem<ProjectFields> | null;
  badgeSuggestions: string[];
  stackSuggestions: string[];
  articles: ArticleOption[];
}) {
  return (
    <ItemEditor definition={projectDefinition} item={project} action={saveProject} badgeSuggestions={badgeSuggestions} articles={articles}>
      {({ fields, update, errors, fieldProps }) => (
        <>
          <Field label="Summary" optional htmlFor="item-summary" error={errors.summary} errorId="item-summary-error" hint="One or two sentences for the card.">
            <textarea
              {...fieldProps("summary")}
              value={fields.summary}
              onChange={(e) => update("summary", e.target.value)}
              maxLength={500}
              rows={2}
              className="field field-sizing-content min-h-20 resize-y"
            />
          </Field>

          <Field
            label="Live link"
            optional
            htmlFor="item-url"
            error={errors.url}
            errorId="item-url-error"
            hint="The card opens this. Without one, it opens the repo, then the article."
          >
            <input
              {...fieldProps("url")}
              type="url"
              inputMode="url"
              value={fields.url}
              onChange={(e) => update("url", e.target.value)}
              placeholder="https://"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="field"
            />
          </Field>

          <Field label="Repo link" optional htmlFor="item-repoUrl" error={errors.repoUrl} errorId="item-repoUrl-error">
            <input
              {...fieldProps("repoUrl")}
              type="url"
              inputMode="url"
              value={fields.repoUrl}
              onChange={(e) => update("repoUrl", e.target.value)}
              placeholder="https://github.com/…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="field"
            />
          </Field>

          <Field label="Stack" optional htmlFor="item-stack" error={errors.stack} errorId="item-stack-error" hint="What it's built with, like Next.js or Phaser.">
            <TagInput
              id="item-stack"
              tags={fields.stack}
              onChange={(stack) => update("stack", stack)}
              suggestions={stackSuggestions}
              normalize={normalizeStackEntry}
              max={12}
              invalid={Boolean(errors.stack)}
              describedBy={errors.stack ? "item-stack-error" : undefined}
            />
          </Field>

          <Field label="Started on" optional htmlFor="item-startedOn" error={errors.startedOn} errorId="item-startedOn-error">
            <input
              {...fieldProps("startedOn")}
              type="date"
              value={fields.startedOn}
              onChange={(e) => update("startedOn", e.target.value)}
              className="field sm:w-56"
            />
          </Field>
        </>
      )}
    </ItemEditor>
  );
}
