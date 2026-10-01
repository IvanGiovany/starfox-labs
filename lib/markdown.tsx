import "server-only";
import type { Element, Root } from "hast";
import { cacheLife } from "next/cache";
import type { ReactNode } from "react";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { hastToReact } from "./markdown-react";

// Markdown → React, on the server. The browser gets finished HTML: no
// markdown parser and no syntax highlighter in the JavaScript bundle.
//
//   remark-parse / remark-gfm  markdown + GitHub extras (tables, task lists, ~~strike~~)
//   remark-rehype              markdown tree → HTML tree. Raw HTML in the markdown
//                              is NOT passed through, so a post can't inject scripts.
//   rehype-slug + autolink     id on every heading, plus a "#" link to it
//   rehype-pretty-code         syntax highlighting with Shiki, in two themes
//                              (light + dark) that follow the site theme via CSS
//   hastToReact                HTML tree → React elements, so code blocks can
//                              include a small client component (the copy button).
//                              Lives in lib/markdown-react.tsx, shared with the
//                              editor's live preview, which runs it in the browser.

/** The page title is the only <h1>; a "# Heading" in a post body becomes an <h2>. */
function rehypeDemoteH1() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "h1") node.tagName = "h2";
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeDemoteH1)
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, {
    behavior: "append",
    properties: { className: ["heading-anchor"], ariaLabel: "Link to this section" },
    content: { type: "text", value: "#" },
  })
  .use(rehypePrettyCode, {
    // Warm themes with purple accents, to sit with UQ purple.
    theme: { light: "rose-pine-dawn", dark: "rose-pine-moon" },
    // Use our own card background instead of the theme's.
    keepBackground: false,
    defaultLang: { block: "plaintext" },
  });

/**
 * Markdown → HTML tree, uncached. Used directly by the editor's live preview,
 * which renders a new half-typed version every few hundred milliseconds:
 * caching those would only fill the cache with drafts nobody reads again.
 */
export async function markdownToHast(markdown: string): Promise<Root> {
  const tree = (await processor.run(processor.parse(markdown))) as Root;
  // Line/column positions on every node are only for tooling; dropping them
  // makes the preview's JSON much smaller.
  visit(tree, (node) => {
    delete node.position;
  });
  return tree;
}

/** Markdown → React, for public pages. */
export async function renderMarkdown(markdown: string): Promise<ReactNode> {
  // Cached by its input: the same markdown always renders the same output, and
  // an edited article is new input, so nothing needs invalidating. This also
  // keeps Shiki's internal clock reads (Date.now) out of prerendering, which
  // Cache Components would otherwise reject.
  "use cache";
  cacheLife("max");

  return hastToReact(await markdownToHast(markdown));
}
