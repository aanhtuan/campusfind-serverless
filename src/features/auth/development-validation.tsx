"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { createAuthService } from "./services";

type Check = { name: string; status: "PASS" | "FAIL"; detail: string };
export function DevelopmentValidation() {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<Check[]>([]);
  async function run() {
    if (busy.current) return;
    busy.current = true; setPending(true); setResults([]);
    const checks: Check[] = [];
    const record = (name: string, pass: boolean, detail: string) => checks.push({ name, status: pass ? "PASS" : "FAIL", detail });
    try {
      const client = createClient();
      const user = await createAuthService(client).getCurrentUser();
      if (!user) throw new Error();
      const profile = await client.from("profiles").select("id, role").eq("id", user.id).single();
      record("Own profile read", !profile.error && profile.data?.id === user.id && profile.data?.role === "USER", "Actual authenticated Data API SELECT; no personal values recorded.");
      // PK id is NOT NULL: these filters cannot match any row, even if grants
      // regress. This probes protected column privileges without changing data.
      const role = await client.from("profiles").update({ role: "ADMIN" }).is("id", null);
      record("Role column permission", role.error?.code === "42501", "Authenticated PATCH with impossible primary-key filter must deny column access.");
      const identity = await client.from("profiles").update({ id: user.id }).is("id", null);
      record("Identity column permission", identity.error?.code === "42501", "Authenticated PATCH with impossible primary-key filter must deny column access.");
      const refresh = await client.auth.refreshSession();
      const refreshedUser = await createAuthService(client).getCurrentUser();
      record("Explicit refresh", !refresh.error && refreshedUser?.id === user.id, "Actual refresh request and verified getUser; not a naturally expired-session test.");
      const responses = await Promise.all(Array.from({ length: 4 }, () => fetch("/dashboard", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15000) })));
      const valid = await Promise.all(responses.map(async response => response.ok && new URL(response.url).pathname === "/dashboard" && /(?:^|,)\s*no-store(?:,|$)/.test(response.headers.get("cache-control") ?? "") && (await response.text()).includes("Your dashboard")));
      record("Concurrent authenticated requests", valid.every(Boolean), "Four real cookie-authenticated requests returned Dashboard with no-store; not concurrent forced-expiry refresh.");
    } catch { record("Validation completion", false, "Unable to complete checks; no provider errors or credentials are displayed."); }
    finally { setResults(checks); busy.current = false; setPending(false); }
  }
  return <main className="mx-auto max-w-3xl space-y-6 px-6 py-12"><h1 className="text-2xl font-semibold">Development authentication validation</h1><p>Development only. Uses your existing session and public Supabase client. No accounts are created, no rows can match the update probes, and no tokens are displayed. Explicit refresh rotates the existing session normally.</p><Button onClick={run} disabled={pending}>{pending ? "Running checks…" : "Run authenticated checks"}</Button><ul aria-live="polite" className="space-y-4">{results.map(check => <li key={check.name}><strong>{check.status}: {check.name}</strong><p className="text-sm text-muted-foreground">{check.detail}</p></li>)}</ul><Link className="block underline" href="/dashboard">Back to dashboard</Link></main>;
}
