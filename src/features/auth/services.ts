import type { SupabaseClient, User } from "@supabase/supabase-js";
import { displayNameSchema } from "./validation";
import { getAppOrigin, safeReturnPath } from "./navigation";

type Result = { ok: true } | { ok: false; error: string };
type Credentials = { email: string; password: string };

// Inject a browser client or a request-scoped client with a writable response
// adapter. Never invoke mutations with a Server Component's read-only client.
export function createAuthService(client: SupabaseClient) {
  function confirmationUrl(returnTo?: string) {
    const url = new URL("/auth/callback", getAppOrigin());
    url.searchParams.set("next", safeReturnPath(returnTo));
    return url.toString();
  }
  return {
    async signUp({ email, password, displayName }: Credentials & { displayName?: string }, returnTo?: string): Promise<Result> {
      try {
        // Accept only a validated name hint; role and identity remain database-owned.
        const name = displayNameSchema.safeParse(displayName);
        if (displayName !== undefined && !name.success) return { ok: false, error: "Enter a valid display name." };
        const { error } = await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: confirmationUrl(returnTo), ...(name.success ? { data: { display_name: name.data } } : {}) } });
        return error ? { ok: false, error: "Unable to create account. Please try again." } : { ok: true };
      } catch { return { ok: false, error: "Unable to create account. Please try again." }; }
    },
    async signInWithPassword({ email, password }: Credentials): Promise<Result> {
      try {
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        return error ? { ok: false, error: "Unable to sign in. Check your credentials or try again." } : { ok: true };
      } catch { return { ok: false, error: "Unable to sign in. Check your credentials or try again." }; }
    },
    async signOut(): Promise<Result> {
      try {
        const { error } = await client.auth.signOut({ scope: "local" });
        return error ? { ok: false, error: "Unable to sign out. Please try again." } : { ok: true };
      } catch { return { ok: false, error: "Unable to sign out. Please try again." }; }
    },
    async getCurrentUser(): Promise<User | null> {
      try {
        const { data, error } = await client.auth.getUser();
        return error ? null : data.user;
      } catch { return null; }
    },
    async resendVerificationEmail(email: string, returnTo?: string): Promise<Result> {
      try {
        const { error } = await client.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: confirmationUrl(returnTo) } });
        return error ? { ok: false, error: "Unable to send verification email. Please try again later." } : { ok: true };
      } catch { return { ok: false, error: "Unable to send verification email. Please try again later." }; }
    },
  };
}
