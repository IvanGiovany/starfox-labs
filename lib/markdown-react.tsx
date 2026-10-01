import type { Root } from "hast";
import { toJsxRuntime, type Components } from "hast-util-to-jsx-runtime";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { CopyButton } from "@/components/copy-button";
import { readSize } from "@/lib/image-size";

// The second half of the markdown renderer: an HTML tree (hast) → React,
// with our own components for code blocks and images. It has no server-only
// imports, so it runs in both places that show articles:
//   - the server, for public pages (lib/markdown.tsx)
//   - the browser, for the editor's live preview, which gets the tree as JSON
//     from /admin/writing/preview
// Same tree + same components = the preview matches the real page.

export function hastToReact(tree: Root): ReactNode {
  return toJsxRuntime(tree, { Fragment, jsx, jsxs, components });
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
  // Images added in the editor carry their size in the URL (…/abc.webp#2400x1600),
  // which becomes width/height so the page keeps their space while they load.
  img({ src, alt, title }) {
    const { src: url, width, height } = typeof src === "string" ? readSize(src) : { src: undefined };
    return (
      <span className="article-image">
        {/* eslint-disable-next-line @next/next/no-img-element -- markdown images can come from anywhere; next/image needs known hosts */}
        <img src={url} width={width} height={height} alt={alt ?? ""} loading="lazy" decoding="async" />
        {title && <span className="article-image-caption">{title}</span>}
      </span>
    );
  },
};
