"use server";

import type { SaveItemInput } from "@/lib/admin/items/item-form";
import { projectDefinition, type ProjectFields } from "@/lib/admin/items/projects";
import { saveItem } from "@/lib/admin/items/save-item";

// The Projects form's Save draft / Publish / Update / Unpublish. saveItem checks
// the admin, validates again on the server, and refreshes the cached pages.
export async function saveProject(input: SaveItemInput<ProjectFields>) {
  return saveItem(projectDefinition, input);
}
