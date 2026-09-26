// Small, dependency-free text search used by the Writing page.
//
// How it scales: the page ships title, summary and tags for every article,
// which stays small. Article bodies live in a separate index
// (/writing/search-index) that the browser only downloads once someone starts
// typing. When that index gets heavy (a few hundred long articles, ~1 MB),
// the next step is Postgres full-text search: a generated tsvector column with
// a GIN index, queried through an RPC. See "Writing" in CLAUDE.md.

/** Article bodies as normalized plain text, keyed by slug (served by /writing/search-index). */
export type SearchIndex = Record<string, string>;

/** Lowercase and strip accents, so "Café" matches "cafe". */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Markdown to plain words: drops link URLs, images, and formatting characters. */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links: keep the text, drop the URL
    .replace(/[#>*_`~|[\]()-]+/g, " ") // formatting characters
    .replace(/\s+/g, " ")
    .trim();
}

/** Split a search box value into normalized words. */
export function toTerms(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

/** True when every term appears somewhere in the (already normalized) text. */
export function matchesAll(haystack: string, terms: string[]): boolean {
  return terms.every((term) => haystack.includes(term));
}
