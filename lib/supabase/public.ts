import { createClient } from "@supabase/supabase-js";

// A Supabase client for public data (published posts). It uses the publishable (anon) key
// and no cookies, so pages that use it can be cached and served statically.
// Row Level Security decides what that key is allowed to see.
//
// Signed-in features (phase 3) get a separate cookie-aware client.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill them in.",
  );
}

export const supabasePublic = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
