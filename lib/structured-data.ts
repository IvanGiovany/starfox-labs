import type { Post } from "./posts";

// Structured data (JSON-LD, schema.org) that tells search engines what a page
// is: on home, the site and the person behind it; on each article, a blog
// post with its author. Plain functions, so they can be tested. The person is
// "Gvan", the name on the site (Ivan, 2026-10-08).

type Site = { url: string; name: string; description: string; handle: string; sameAs: string[] };

const personId = (siteUrl: string) => new URL("/#person", siteUrl).href;
const websiteId = (siteUrl: string) => new URL("/#website", siteUrl).href;

function person(site: Site) {
  return {
    "@type": "Person",
    "@id": personId(site.url),
    name: site.handle,
    url: new URL("/", site.url).href,
    ...(site.sameAs.length && { sameAs: site.sameAs }),
  };
}

/** Home: the website, published by its person. */
export function homeJsonLd(site: Site) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId(site.url),
        url: new URL("/", site.url).href,
        name: site.name,
        description: site.description,
        inLanguage: "en",
        publisher: { "@id": personId(site.url) },
      },
      person(site),
    ],
  };
}

/** An article: a BlogPosting by the site's person, with its preview image. */
export function articleJsonLd(post: Pick<Post, "slug" | "title" | "summary" | "tags" | "publishedAt" | "coverImageUrl">, site: Site) {
  const url = new URL(`/writing/${post.slug}`, site.url).href;
  const images = [
    // Covers are stored with "#WxH" for the layout; the fragment isn't part of the file's address.
    ...(post.coverImageUrl ? [post.coverImageUrl.split("#")[0]] : []),
    new URL(`/writing/${post.slug}/opengraph-image/card`, site.url).href,
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: url,
    url,
    headline: post.title.slice(0, 110), // Google's limit
    description: post.summary,
    datePublished: post.publishedAt,
    image: images,
    inLanguage: "en",
    ...(post.tags.length && { keywords: post.tags.join(", ") }),
    author: { "@type": "Person", "@id": personId(site.url), name: site.handle, url: new URL("/", site.url).href },
    publisher: { "@id": personId(site.url) },
    isPartOf: { "@id": websiteId(site.url) },
  };
}

/** The JSON for a <script type="application/ld+json">, with "<" escaped so no text can close the tag. */
export const jsonLdText = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
