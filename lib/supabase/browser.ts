import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../database.types";
import { supabasePublishableKey, supabaseUrl } from "./config";

// A Supabase client for the browser that acts as the signed-in visitor, using
// the same session cookie as the server client. The admin uses it to upload
// images straight to Storage: no hop through our server (whose request bodies
// are capped), and Storage's policies still allow uploads only for the admin.
//
// createBrowserClient reuses one client per page, so calling this often is fine.
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
