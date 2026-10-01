import { z } from "zod";
import type { Tables, TablesInsert } from "@/lib/database.types";
import {
  baseFromRow,
  baseItemShape,
  baseToRow,
  chipList,
  EMPTY_BASE_ITEM,
  optionalDate,
  optionalLink,
  optionalText,
  type BaseItemFields,
  type FieldErrors,
  type ItemDefinition,
} from "./item-form";
import { ITEM_SECTIONS } from "./sections";

// Projects: what one project card holds, its rules, and how it maps to the
// `projects` table. A card links to the live project, else the repo, else the
// article about it; a published project needs at least one of the three.

const section = ITEM_SECTIONS.projects;

/** "next.js" stays "next.js": stack entries are names, not slugs. */
const normalizeStackEntry = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 30);

export const projectSchema = z.object({
  ...baseItemShape(section),
  summary: optionalText(500),
  url: optionalLink,
  repoUrl: optionalLink,
  stack: chipList(normalizeStackEntry, 12, "stack entries"),
  startedOn: optionalDate,
});

export type ProjectFields = BaseItemFields & {
  summary: string;
  url: string;
  repoUrl: string;
  stack: string[];
  startedOn: string;
};

export const EMPTY_PROJECT: ProjectFields = { ...EMPTY_BASE_ITEM, summary: "", url: "", repoUrl: "", stack: [], startedOn: "" };

/** Same rule as the database's `published_projects_have_a_link`. */
export function projectPublishRules(data: z.output<typeof projectSchema>): FieldErrors<ProjectFields> {
  if (!data.url && !data.repoUrl && !data.postId) {
    return { url: "A published project needs somewhere to go: a live link, a repo link or an article." };
  }
  return {};
}

export function projectToRow(data: z.output<typeof projectSchema>): Omit<TablesInsert<"projects">, "status"> {
  return {
    ...baseToRow(data),
    summary: data.summary || null,
    url: data.url || null,
    repo_url: data.repoUrl || null,
    stack: data.stack,
    started_on: data.startedOn || null,
  };
}

export const projectDefinition: ItemDefinition<ProjectFields, z.output<typeof projectSchema>> = {
  section,
  schema: projectSchema,
  publishRules: projectPublishRules,
  toRow: projectToRow,
  empty: EMPTY_PROJECT,
};

export function projectFromRow(row: Tables<"projects">): ProjectFields {
  return {
    ...baseFromRow(row),
    summary: row.summary ?? "",
    url: row.url ?? "",
    repoUrl: row.repo_url ?? "",
    stack: row.stack,
    startedOn: row.started_on ?? "",
  };
}
