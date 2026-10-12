import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { createAuthService } from "./services";
import { loginDestination } from "./navigation";

export async function getCurrentUser() {
  const client = await createClient();
  return createAuthService(client).getCurrentUser();
}
export async function requireUser(returnTo: string) {
  const user = await getCurrentUser();
  if (!user) redirect(loginDestination(returnTo).toString());
  return user;
}
