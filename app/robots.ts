import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// /robots.txt: crawl everything public, skip the signed-in and private pages,
// and here's the sitemap. (Those pages also send noindex themselves; this just
// saves crawlers the trip. It isn't security: requireAdmin(), requireUser()
// and RLS are.)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/settings", "/login", "/auth", "/goodbye"],
    },
    sitemap: new URL("/sitemap.xml", site.url).href,
  };
}
