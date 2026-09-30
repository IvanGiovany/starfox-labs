// Supabase connection settings, shared by every client (public, server, proxy).
// Both values are public by design: Row Level Security decides what they can do.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill them in.",
  );
}

export const supabaseUrl = url;
export const supabasePublishableKey = publishableKey;
