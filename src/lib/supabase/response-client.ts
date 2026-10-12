import { createServerClient, type CookieOptions, type CookieMethodsServer } from "@supabase/ssr";
import { type NextRequest, type NextResponse } from "next/server";
import { getPublicSupabaseConfig } from "./config";

export function preventAuthCaching(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

// Request cookies feed downstream Server Components; pending cookies/headers
// are applied to whichever response (next OR redirect) is ultimately returned.
export function createResponseAdapter(request: NextRequest) {
  const pending = new Map<string, { name: string; value: string; options: CookieOptions }>();
  const headers = new Headers();
  const cookies: CookieMethodsServer = {
    getAll: () => request.cookies.getAll(),
    setAll: (updates, cacheHeaders) => {
      for (const cookie of updates) {
        request.cookies.set(cookie.name, cookie.value);
        pending.set(cookie.name, cookie);
      }
      for (const [name, value] of Object.entries(cacheHeaders)) headers.set(name, value);
    },
  };
  return {
    cookies,
    apply(response: NextResponse): NextResponse {
      for (const { name, value, options } of pending.values()) response.cookies.set(name, value, options);
      headers.forEach((value, name) => response.headers.set(name, value));
      return preventAuthCaching(response);
    },
  };
}

export function createRequestClient(request: NextRequest) {
  const { url, publishableKey } = getPublicSupabaseConfig();
  const adapter = createResponseAdapter(request);
  const client = createServerClient(url, publishableKey, {
    cookieOptions: { sameSite: "lax", secure: request.nextUrl.protocol === "https:" },
    cookies: adapter.cookies,
  });
  return { client, apply: adapter.apply };
}
