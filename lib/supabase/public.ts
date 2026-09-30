import { createClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "./config";

// A Supabase client for public data (published posts). It uses the publishable
// (anon) key and no cookies, so pages that use it can be cached and served
// statically. Row Level Security decides what that key is allowed to see.
//
// Signed-in work (the admin) uses the cookie-aware client in ./server.ts.
export const supabasePublic = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
