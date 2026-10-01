import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife } from "next/cache";
import type { ReactNode } from "react";
import { renderMarkdown } from "@/lib/markdown";

/**
 * WRITING.md, rendered by the same renderer as articles, for the editor's "?"
 * panel. Cached: reading a file must happen inside "use cache" (see CLAUDE.md),
 * and the file only changes with a deploy. next.config.ts ships it with the
 * editor routes, since they render at request time on Vercel.
 */
export async function getCheatSheet(): Promise<ReactNode> {
  "use cache";
  cacheLife("max");
  const markdown = await readFile(join(process.cwd(), "WRITING.md"), "utf8");
  // Drop the "# Writing cheat sheet" title: the panel has its own heading.
  return renderMarkdown(markdown.replace(/^# .*\n+/, ""));
}
