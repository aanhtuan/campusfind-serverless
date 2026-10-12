export type PublicSupabaseConfig = Readonly<{ url: string; publishableKey: string }>;

type Environment = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

export class SupabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigurationError";
  }
}

export function parsePublicSupabaseConfig(env: Environment): PublicSupabaseConfig {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) {
    throw new SupabaseConfigurationError(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart Next.js.",
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SupabaseConfigurationError("NEXT_PUBLIC_SUPABASE_URL must be a valid project URL.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if ((parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) ||
      parsed.username || parsed.password || parsed.search || parsed.hash ||
      parsed.pathname !== "/" || parsed.hostname === "your-project-ref.supabase.co") {
    throw new SupabaseConfigurationError("Use the HTTPS Supabase project origin (HTTP is allowed only for localhost).");
  }
  // Accept only modern public keys; legacy JWT keys could contain service_role.
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey) ||
      publishableKey.includes("REPLACE_ME")) {
    throw new SupabaseConfigurationError("Use a public sb_publishable_ key; secret, service-role and placeholder keys are rejected.");
  }
  return { url: parsed.origin, publishableKey };
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  // Static property access is required for Next.js browser env substitution.
  return parsePublicSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
