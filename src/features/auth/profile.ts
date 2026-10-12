import type { SupabaseClient, User } from "@supabase/supabase-js";
import { displayNameSchema } from "./validation";

// Editable metadata is only a name hint, never authorization. Identity comes
// from getUser(), and column grants/RLS still enforce ownership and USER role.
export async function initializeProfileName(client: SupabaseClient, user: User) {
  const name = displayNameSchema.safeParse(user.user_metadata?.display_name);
  if (!name.success) return;
  return client.from("profiles").update({ display_name: name.data }).eq("id", user.id).is("display_name", null);
}
