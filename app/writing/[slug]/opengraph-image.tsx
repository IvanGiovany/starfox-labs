import { formatDate } from "@/lib/format";
import { ogImage, ogSize } from "@/lib/og";
import { articleStaticParams, getPostBySlug, readingTime } from "@/lib/posts";
import { site } from "@/lib/site";

// Each article's link preview: its title, date and reading time.

// Same list as the article page, so every preview is generated at build time.
export const generateStaticParams = articleStaticParams;

// Lets the alt text be the article's own title (a plain `export const alt`
// would be the same for every article). Social sites read it aloud to
// screen-reader users.
export async function generateImageMetadata({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  return [
    {
      id: "card",
      size: ogSize,
      contentType: "image/png",
      alt: post ? `${post.title}, an article on ${site.name}` : site.name,
    },
  ];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) return ogImage({ title: site.name, section: "Writing" });

  return ogImage({
    title: post.title,
    subtitle: `${formatDate(post.publishedAt)} · ${readingTime(post.bodyMd)} min read`,
    section: "Writing",
  });
}
