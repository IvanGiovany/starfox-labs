import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16's caching model: data functions opt in with "use cache",
  // everything else is fresh per request. See lib/posts.ts.
  cacheComponents: true,
};

export default nextConfig;
