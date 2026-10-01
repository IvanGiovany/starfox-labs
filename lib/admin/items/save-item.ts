import "server-only";
import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import type { TablesInsert, TablesUpdate } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { statusAfter, type PostStatus } from "../post-form";
import { explainItemError } from "./item-errors";
import {
  validateItem,
  type BaseItemFields,
  type FieldErrors,
  type ItemDefinition,
  type SaveItemInput,
  type SaveItemResult,
} from "./item-form";

export type { SaveItemInput, SaveItemResult };

// Saving an item, for every section: Save draft / Publish / Update / Unpublish.
// Each section's server action is a one-liner around this.

export async function saveItem<F extends BaseItemFields, D>(
  definition: ItemDefinition<F, D>,
  input: SaveItemInput<F>,
): Promise<SaveItemResult<F>> {
  await requireAdmin();
  const { section } = definition;

  const status = statusAfter(input.intent, input.status);
  const checked = validateItem(definition.schema, definition.publishRules, input.fields, status);
  if (!checked.ok) return { ok: false, error: "Check the highlighted fields.", fieldErrors: checked.fieldErrors };
  const row = { ...definition.toRow(checked.data), status };

  const supabase = await createSupabaseServerClient();
  // supabase-js can't type a query whose table is only known at runtime, so the
  // query is typed as "projects". Each section's toRow is typed against its own
  // table instead, and the database checks every column again.
  const items = () => supabase.from(section.table as "projects");
  const columns = "id, status, updated_at";

  let result;
  if (input.id === null) {
    // New items go to the top of the section's order.
    const first = await items().select("sort_order").order("sort_order").limit(1).maybeSingle();
    const sortOrder = (first.data?.sort_order ?? 1) - 1;
    result = await items()
      .insert({ ...row, sort_order: sortOrder } as TablesInsert<"projects">)
      .select(columns)
      .single();
  } else {
    result = await items()
      .update(row as TablesUpdate<"projects">)
      .eq("id", input.id)
      .eq("updated_at", input.updatedAt ?? "") // only if nobody saved in between
      .select(columns)
      .maybeSingle();
  }

  if (result.error) {
    const explained = explainItemError(section.table, result.error);
    return {
      ok: false,
      error: explained.message,
      fieldErrors: explained.field ? ({ [explained.field]: explained.message } as FieldErrors<F>) : undefined,
    };
  }
  if (!result.data) {
    return {
      ok: false,
      error: `This ${section.singular} was changed somewhere else (or deleted). Your text is backed up on this device: reload, then choose Restore.`,
    };
  }

  // The section page and the home grid show items; an article's "about this"
  // panel shows the item linked to it.
  updateTag(section.cacheTag);
  updateTag("home");
  updateTag("posts");
  return { ok: true, id: result.data.id, status: result.data.status as PostStatus, updatedAt: result.data.updated_at };
}
