import { NextResponse, type NextRequest } from "next/server";
import { createRequestClient, preventAuthCaching } from "../../lib/supabase/response-client";
import { parseCodeCallback, parseConfirmation } from "./callback-validation";
import { initializeProfileName } from "./profile";
import { getAppOrigin, loginDestination } from "./navigation";

export async function handleAuthCallback(request: NextRequest, mode: "confirm" | "code", factory = createRequestClient) {
  try { getAppOrigin(); } catch {
    return preventAuthCaching(new NextResponse("Authentication configuration unavailable.", { status: 503 }));
  }
  const parsed = mode === "confirm" ? parseConfirmation(request.nextUrl.searchParams) : parseCodeCallback(request.nextUrl.searchParams);
  const failure = () => preventAuthCaching(NextResponse.redirect(loginDestination("/dashboard", "confirmation_failed"), 303));
  if (!parsed) return failure();
  let context: ReturnType<typeof createRequestClient>;
  try { context = factory(request); } catch { return failure(); }
  try {
    const result = "token_hash" in parsed
      ? await context.client.auth.verifyOtp({ token_hash: parsed.token_hash, type: parsed.type })
      : await context.client.auth.exchangeCodeForSession(parsed.code);
    if (result.error) return context.apply(failure());
    const identity = await context.client.auth.getUser();
    if (identity.error || !identity.data.user) return context.apply(failure());
    await initializeProfileName(context.client, identity.data.user);
    // URL built from trusted configuration, never Host/X-Forwarded-Host.
    return context.apply(NextResponse.redirect(new URL(parsed.next, getAppOrigin()), 303));
  } catch { return context.apply(failure()); }
}
