import type { NextConfig } from "next";

// Images uploaded through the admin editor live in Supabase Storage's public
// bucket. Allowing exactly that path lets next/image optimize them, while any
// other remote image URL is refused.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  // Next 16's caching model: data functions opt in with "use cache",
  // everything else is fresh per request. See lib/posts.ts.
  cacheComponents: true,
  images: {
    remotePatterns: supabaseUrl ? [new URL(`${supabaseUrl}/storage/v1/object/public/**`)] : [],
  },
};

export default nextConfig;
