import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "./config";

// A Supabase client that acts as the signed-in visitor, using their session
// cookie. Create a new one for every request; never share it.
//
// Reading cookies makes whatever calls this request-time, so only use it for
// signed-in work (the admin), never for public pages.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components can't set cookies. That's fine: proxy.ts refreshes
          // the session on every admin request, so the cookie is already fresh.
        }
      },
    },
  });
}
