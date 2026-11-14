"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { createAuthService } from "./services";

type Check = { name: string; status: "PASS" | "FAIL"; detail: string };
export function DevelopmentValidation() {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<Check[]>([]);
  const [peerId, setPeerId] = useState("");
  const [peerName, setPeerName] = useState("");
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
      const valid = await Promise.all(responses.map(async response => response.ok && new URL(response.url).pathname === "/dashboard" && /(?:^|,)\s*no-store(?:,|$)/.test(response.headers.get("cache-control") ?? "") && (await response.text()).includes("Xin chào,")));
      record("Concurrent authenticated requests", valid.every(Boolean), "Four real cookie-authenticated requests returned Dashboard with no-store; not concurrent forced-expiry refresh.");
    } catch { record("Validation completion", false, "Unable to complete checks; no provider errors or credentials are displayed."); }
    finally { setResults(checks); busy.current = false; setPending(false); }
  }
  async function runRenewal() {
    if (busy.current) return;
    busy.current = true; setPending(true); setResults([]);
    try {
      const client = createClient();
      const before = await createAuthService(client).getCurrentUser();
      if (!before) throw new Error();
      const [refresh, responses] = await Promise.all([
        client.auth.refreshSession(),
        Promise.all(Array.from({ length: 4 }, () => fetch("/dashboard", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15000) }))),
      ]);
      const after = await createAuthService(client).getCurrentUser();
      const valid = await Promise.all(responses.map(async response => response.ok && new URL(response.url).pathname === "/dashboard" && /(?:^|,)\s*no-store(?:,|$)/.test(response.headers.get("cache-control") ?? "") && (await response.text()).includes("Xin chào,")));
      const pass = !refresh.error && after?.id === before.id && valid.every(Boolean);
      setResults([{ name: "Requests during explicit renewal", status: pass ? "PASS" : "FAIL", detail: "Four Dashboard requests were launched concurrently with refreshSession; all must return no-store and preserve verified identity. Tokens were initially valid. This does not prove concurrent expired-token refresh." }]);
    } catch { setResults([{ name: "Requests during explicit renewal", status: "FAIL", detail: "Unable to complete checks; no provider errors or credentials are recorded." }]); }
    finally { busy.current = false; setPending(false); }
  }
  async function runCrossUser() {
    if (busy.current) return;
    busy.current = true; setPending(true); setResults([]);
    const checks: Check[] = [];
    const requireCheck = (name: string, pass: boolean, detail: string) => {
      checks.push({ name, status: pass ? "PASS" : "FAIL", detail });
      if (!pass) throw new Error("Stop on the first unexpected authorization result.");
    };
    try {
      const target = peerId.trim();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target) || !peerName.trim()) {
        requireCheck("Peer fixture", false, "Supply the authorized peer UUID and their exact existing display name. No request was made.");
      }
      const client = createClient();
      const user = await createAuthService(client).getCurrentUser();
      requireCheck("Verified normal account", !!user?.email_confirmed_at && user.id !== target, "Remote getUser must verify a confirmed identity distinct from the authorized peer.");
      if (!user) return;
      const own = await client.from("profiles").select("id, role, display_name, created_at, updated_at").eq("id", user.id).single();
      requireCheck("Own USER profile", !own.error && own.data?.id === user.id && own.data?.role === "USER", "Actual authenticated own-profile SELECT, before cross-user requests.");
      const read = await client.from("profiles").select("id").eq("id", target);
      requireCheck("Peer private profile hidden", !read.error && Array.isArray(read.data) && read.data.length === 0, "Authenticated peer SELECT returned zero rows. Provider/network errors do not count as a pass.");
      // The operator supplies the target's existing name. If RLS regresses,
      // updated_at may still change; stop on any returned row and do not undo it.
      const write = await client.from("profiles").update({ display_name: peerName }).eq("id", target).select("id");
      requireCheck("Peer profile UPDATE denied", !write.error && Array.isArray(write.data) && write.data.length === 0, "Authenticated PATCH of the peer's existing name returned zero rows. Verify the target snapshot separately before/after.");
      for (const [column, value] of [["role", "ADMIN"], ["id", user.id], ["created_at", own.data?.created_at], ["updated_at", own.data?.updated_at]] as const) {
        const probe = await client.from("profiles").update({ [column]: value }).is("id", null);
        requireCheck(`${column} column permission`, probe.error?.code === "42501", "Impossible-row PATCH must reject protected-column access; no profile can match this filter.");
      }
      const after = await client.from("profiles").select("id, role, display_name, created_at, updated_at").eq("id", user.id).single();
      requireCheck("Own profile unchanged", !after.error && JSON.stringify(after.data) === JSON.stringify(own.data), "Authenticated own-profile snapshot is unchanged after all probes.");
    } catch {
      if (!checks.some(check => check.status === "FAIL")) checks.push({ name: "Cross-user completion", status: "FAIL", detail: "Unable to complete checks. No provider errors, private profiles or credentials are recorded." });
    } finally { setResults(checks); busy.current = false; setPending(false); }
  }
  return <main className="mx-auto max-w-3xl space-y-6 px-6 py-12"><h1 className="text-2xl font-semibold">Development authentication validation</h1><p>Development only. Uses your existing session and public Supabase client. No accounts are created and no tokens are displayed. Protected-column probes cannot match any row. Explicit refresh rotates the existing session normally.</p><Button onClick={run} disabled={pending}>{pending ? "Running checks…" : "Run authenticated checks"}</Button><Button onClick={runRenewal} disabled={pending}>Run requests during explicit renewal</Button><section className="space-y-3"><h2 className="text-xl font-semibold">Authorized cross-user RLS checks</h2><p>Requires two confirmed USER accounts and approval to test both directions. Record the target profile before/after. A denied peer update must return zero rows; if it unexpectedly succeeds, its timestamp can change. Checks stop on the first failure.</p><label htmlFor="peer-id">Authorized peer UUID</label><Input id="peer-id" value={peerId} onChange={event => setPeerId(event.target.value)} disabled={pending} autoComplete="off" /><label htmlFor="peer-name">Peer existing display name (exact value)</label><Input id="peer-name" value={peerName} onChange={event => setPeerName(event.target.value)} disabled={pending} autoComplete="off" /><Button onClick={runCrossUser} disabled={pending || !peerId.trim() || !peerName.trim()}>Run cross-user RLS checks</Button></section><ul aria-live="polite" className="space-y-4">{results.map(check => <li key={check.name}><strong>{check.status}: {check.name}</strong><p className="text-sm text-muted-foreground">{check.detail}</p></li>)}</ul><Link className="block underline" href="/dashboard">Back to dashboard</Link></main>;
}
