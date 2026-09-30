import type { NextConfig } from "next";

// next/image only optimizes remote images from the addresses listed here;
// anything else is refused. Uploads live in Supabase Storage's public bucket.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  // Next 16's caching model: data functions opt in with "use cache",
  // everything else is fresh per request. See lib/posts.ts.
  cacheComponents: true,
  images: {
    remotePatterns: [
      ...(supabaseUrl ? [new URL(`${supabaseUrl}/storage/v1/object/public/**`)] : []),
      // Thumbnails for the click-to-play YouTube player on articles.
      new URL("https://i.ytimg.com/vi/**"),
    ],
  },
};

export default nextConfig;
