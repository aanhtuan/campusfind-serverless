import "server-only";

import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicSupabaseConfig } from "./config";

// A new client for each render/request. Proxy refreshes before Server Components.
// Mutations must use a response-aware adapter (response-client.ts), never this
// default read-only render adapter. Server Components cannot set response cookies.
export async function createClient(responseCookies?: CookieMethodsServer) {
  const { url, publishableKey } = getPublicSupabaseConfig();
  const cookieStore = await cookies();
  return createServerClient(url, publishableKey, {
    cookies: responseCookies ?? {
      getAll: () => cookieStore.getAll(),
      setAll: () => { /* Proxy owns persisted cookie refresh during rendering. */ },
    },
  });
}
