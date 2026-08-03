import { createClient } from "@supabase/supabase-js";

/**
 * Browser client. It is intentionally created only when the public variables
 * exist so the UI can run as a design/demo environment before Supabase is linked.
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}
