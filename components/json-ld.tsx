import { jsonLdText } from "@/lib/structured-data";

// Structured data for search engines (lib/structured-data.ts), rendered on the
// server as Next.js recommends. It's data, not a script that runs.
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(data) }} />;
}
