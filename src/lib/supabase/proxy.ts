import { NextResponse, type NextRequest } from "next/server";
import { isProtectedPath, loginDestination } from "../../features/auth/navigation";
import { createRequestClient, preventAuthCaching } from "./response-client";

export async function updateSession(request: NextRequest, factory = createRequestClient) {
  const protectedRoute = isProtectedPath(request.nextUrl.pathname);
  let context: ReturnType<typeof createRequestClient>;
  try {
    context = factory(request);
  } catch {
    // Landing/public routes remain usable without Supabase configuration.
    return preventAuthCaching(protectedRoute
      ? new NextResponse("Authentication configuration unavailable.", { status: 503 })
      : NextResponse.next());
  }
  let user = null;
  try {
    // Verified Auth response also refreshes expired tokens via SSR. Do not use
    // getSession() or decode cookies as an authorization decision.
    const result = await context.client.auth.getUser();
    if (!result.error) user = result.data.user;
  } catch { /* Fail closed; never log provider errors/tokens. */ }
  if (protectedRoute && !user) {
    try {
      const destination = loginDestination(request.nextUrl.pathname + request.nextUrl.search);
      return context.apply(NextResponse.redirect(destination));
    } catch {
      return context.apply(new NextResponse("Authentication configuration unavailable.", { status: 503 }));
    }
  }
  return context.apply(NextResponse.next({ request }));
}
