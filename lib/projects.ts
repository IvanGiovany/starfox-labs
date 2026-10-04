import { cacheLife, cacheTag } from "next/cache";
import { mediaUrl } from "./media";
import { supabasePublic } from "./supabase/public";

// Projects for the public pages. Cached for an hour and tagged "projects"
// (and "posts": a card links to its article only once that's published);
// saving in the admin refreshes both tags, so changes show at once.

export type ProjectLink = { label: string; href: string };

export type Project = {
  id: string;
  title: string;
  summary: string | null;
  stack: string[];
  imageUrl: string | null;
  imageAlt: string;
  cardSize: "small" | "wide";
  /** Where the card goes: the live project, else its repo, else the article. Null: nowhere yet. */
  href: string | null;
  /** The other places, shown as small links on the card. */
  links: ProjectLink[];
};

type ProjectRow = {
  id: string;
  title: string;
  summary: string | null;
  stack: string[];
  url: string | null;
  repo_url: string | null;
  image_path: string | null;
  image_alt: string | null;
  card_size: string;
  post: { slug: string; status: string } | null;
};

/** "GitHub" for GitHub repos, "Code" for anywhere else. */
function repoLabel(url: string): string {
  return URL.canParse(url) && new URL(url).hostname.replace(/^www\./, "") === "github.com" ? "GitHub" : "Code";
}

/** Where a project leads: its main link, then the rest as small links. */
export function projectLinks(row: Pick<ProjectRow, "url" | "repo_url" | "post">): { href: string | null; links: ProjectLink[] } {
  const all: ProjectLink[] = [
    ...(row.url ? [{ label: "Live", href: row.url }] : []),
    ...(row.repo_url ? [{ label: repoLabel(row.repo_url), href: row.repo_url }] : []),
    ...(row.post?.status === "published" ? [{ label: "Article", href: `/writing/${row.post.slug}` }] : []),
  ];
  return { href: all[0]?.href ?? null, links: all.slice(1) };
}

/** Published projects in Ivan's order (drag to reorder in the admin). */
export async function getPublishedProjects(): Promise<Project[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("projects", "posts");

  const { data, error } = await supabasePublic
    .from("projects")
    .select("id, title, summary, stack, url, repo_url, image_path, image_alt, card_size, post:posts(slug, status)")
    .eq("status", "published")
    .order("sort_order")
    .order("created_at", { ascending: false })
    .order("id")
    .returns<ProjectRow[]>();
  if (error) throw new Error(`Failed to load projects: ${error.message}`);

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    stack: row.stack,
    imageUrl: row.image_path ? mediaUrl(row.image_path) : null,
    imageAlt: row.image_alt ?? "",
    cardSize: row.card_size === "wide" ? "wide" : "small",
    ...projectLinks(row),
  }));
}
