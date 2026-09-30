import type { Element, Root } from "hast";
import { toJsxRuntime, type Components } from "hast-util-to-jsx-runtime";
import { cacheLife } from "next/cache";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { CopyButton } from "@/components/copy-button";

// Markdown → React, on the server. The browser gets finished HTML: no
// markdown parser and no syntax highlighter in the JavaScript bundle.
//
//   remark-parse / remark-gfm  markdown + GitHub extras (tables, task lists, ~~strike~~)
//   remark-rehype              markdown tree → HTML tree. Raw HTML in the markdown
//                              is NOT passed through, so a post can't inject scripts.
//   rehype-slug + autolink     id on every heading, plus a "#" link to it
//   rehype-pretty-code         syntax highlighting with Shiki, in two themes
//                              (light + dark) that follow the site theme via CSS
//   toJsxRuntime               HTML tree → React elements, so code blocks can
//                              include a small client component (the copy button)

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

export async function renderMarkdown(markdown: string): Promise<ReactNode> {
  // Cached by its input: the same markdown always renders the same output, and
  // an edited article is new input, so nothing needs invalidating. This also
  // keeps Shiki's internal clock reads (Date.now) out of prerendering, which
  // Cache Components would otherwise reject.
  "use cache";
  cacheLife("max");

  const hast = await processor.run(processor.parse(markdown));
  return toJsxRuntime(hast as Root, { Fragment, jsx, jsxs, components });
}

type WithData = { "data-language"?: string; "data-rehype-pretty-code-figure"?: string };

const components: Partial<Components> = {
  // Code blocks: a small bar with the filename (```ts title="app/page.tsx")
  // or the language, and a copy button.
  figure(props) {
    if (!("data-rehype-pretty-code-figure" in props)) return <figure {...props} />;

    const parts = Children.toArray(props.children).filter(isValidElement) as ReactElement<
      WithData & { children?: ReactNode }
    >[];
    const title = parts.find((part) => part.type === "figcaption");
    const pre = parts.find((part) => part.type === "pre");
    const language = pre?.props["data-language"];

    return (
      <figure className="code-block">
        <div className="code-block-bar">
          <span className={title ? "code-block-title" : undefined}>
            {title ? title.props.children : language !== "plaintext" ? language : "text"}
          </span>
          <CopyButton />
        </div>
        {pre}
      </figure>
    );
  },

  // Images: lazy-loaded, with the markdown title as a caption:
  // ![alt text](url "Caption shown under the image")
  img({ src, alt, title }) {
    return (
      <span className="article-image">
        {/* eslint-disable-next-line @next/next/no-img-element -- sizes are unknown for images inside markdown */}
        <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" decoding="async" />
        {title && <span className="article-image-caption">{title}</span>}
      </span>
    );
  },
};
