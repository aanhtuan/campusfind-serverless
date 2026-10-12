import "server-only";

import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicSupabaseConfig } from "./config";

// Create per request. A response-aware adapter is required for auth operations;
// it must propagate both cookies AND the SSR library's cache headers.
export async function createClient(responseCookies?: CookieMethodsServer) {
  const { url, publishableKey } = getPublicSupabaseConfig();
  const cookieStore = await cookies();
  return createServerClient(url, publishableKey, {
    cookies: responseCookies ?? {
      getAll: () => cookieStore.getAll(),
      setAll: () => {
        throw new Error("Session cookie writes require a response-aware adapter. Session refresh and auth handlers are implemented in Task 03B.");
      },
    },
  });
}
