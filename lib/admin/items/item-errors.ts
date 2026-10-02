import { ITEM_SECTIONS, type ItemTable } from "./sections";

// Turns the database's refusals into sentences, pinned to the form field they're
// about. The forms check the same rules first, so these mostly show up if
// something changed elsewhere in the meantime, or if a check was missed.

export type ExplainedError = { message: string; field?: string };

type DbError = { code?: string; message?: string };

// Named rules from the content tables migration.
const RULES: Record<string, ExplainedError> = {
  published_projects_have_a_link: {
    field: "url",
    message: "A published project needs somewhere to go: a live link, a repo link or an article.",
  },
  published_tracks_have_article_and_snippet: {
    field: "postId",
    message: "A finished, published song needs its article and its audio snippet. (A song still in progress can be published without them.)",
  },
  // The snippet's measured length has no input of its own: both point at the snippet field.
  tracks_snippet_seconds_check: { field: "snippetPath", message: "The snippet's length didn't come through right. Add it again." },
  tracks_snippet_seconds_need_snippet: { field: "snippetPath", message: "The snippet's length was saved without the snippet. Add it again." },
  published_games_have_review: { field: "postId", message: "A published game needs its review article." },
  published_hobby_items_have_category: { field: "category", message: "A published hobby item needs a category." },
  books_finished_after_started: { field: "finishedOn", message: "The finish date can't be before the start date." },
};

// Postgres names single-column checks "<table>_<column>_check".
const COLUMN_MESSAGES: Record<string, string> = {
  title: "Add a title.",
  url: "Use a full link starting with https://.",
  repo_url: "Use a full link starting with https://.",
  full_track_url: "Use a full link starting with https://.",
  isbn: "An ISBN has 10 or 13 digits (the last may be an X).",
  published_year: "Use a year between 0 and 2100.",
  page_count: "The page count has to be above zero.",
  hours_played: "Hours played can't be negative.",
  category: "The category can't be blank.",
  status: "Unknown status.",
  card_size: "Pick small or wide.",
};

const camel = (column: string) => column.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

const sectionLabel = (table: string) => Object.values(ITEM_SECTIONS).find((s) => s.table === table)?.label ?? table;

export function explainItemError(table: ItemTable, error: DbError): ExplainedError {
  const message = error.message ?? "";
  const constraint = message.match(/constraint "([^"]+)"/)?.[1] ?? "";

  if (RULES[constraint]) return RULES[constraint];

  if (constraint === `${table}_rating_check`) {
    return { field: "rating", message: table === "books" ? "Rate from 1 to 5 stars." : "Rate from 1 to 10." };
  }
  const column = constraint.startsWith(`${table}_`) && constraint.endsWith("_check") ? constraint.slice(table.length + 1, -"_check".length) : "";
  if (COLUMN_MESSAGES[column]) return { field: camel(column), message: COLUMN_MESSAGES[column] };

  // An article can belong to one item only: per table (unique key) or across tables (trigger).
  if (constraint === `${table}_post_id_key`) {
    return { field: "postId", message: `That article is already linked from another item in ${sectionLabel(table)}.` };
  }
  const linkedFrom = message.match(/already linked from an item in (\w+)/)?.[1];
  if (linkedFrom) return { field: "postId", message: `That article is already linked from an item in ${sectionLabel(linkedFrom)}.` };

  if (error.code === "23503" && message.includes("post_id")) {
    return { field: "postId", message: "That article no longer exists. Pick another one." };
  }
  if (error.code === "42501") return { message: "Only the admin can change this. Try signing in again." };

  return { message: "Something went wrong saving that. Try again." };
}
