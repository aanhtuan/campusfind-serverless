import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function discoveryContext() {
  const client = await createClient();
  let authenticated = false;
  let userId: string | null = null;
  try { const { data, error } = await client.auth.getUser(); authenticated = !error && Boolean(data.user); userId = !error ? data.user?.id ?? null : null; } catch { /* Public text browsing does not require login. */ }
  return { client, authenticated, userId };
}
