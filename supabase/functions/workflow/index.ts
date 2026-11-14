import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { parseWorkflowRequest } from "../_shared/validation.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "private, no-store",
};
const reply = (status: number, body: object) => Response.json(body, { status, headers });
Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply(405, { error: "POST required." });
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return reply(401, { error: "Sign in again." });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !key) return reply(503, { error: "Workflow unavailable." });
    // Caller-scoped client, never a service-role client. getUser performs live
    // Auth verification; PostgreSQL independently authorizes auth.uid().
    const client = createClient(url, key, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: identity, error: authError } = await client.auth.getUser();
    if (authError || !identity.user) return reply(401, { error: "Sign in again." });
    if (!request.headers.get("content-type")?.includes("application/json")) return reply(400, { error: "JSON required." });
    const reader = request.body?.getReader();
    if (!reader) return reply(400, { error: "JSON required." });
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 32768) { await reader.cancel(); return reply(413, { error: "Request too large." }); }
      chunks.push(value);
    }
    const body = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    const raw = new TextDecoder().decode(body);
    let parsed;
    try { parsed = parseWorkflowRequest(JSON.parse(raw)); }
    catch { return reply(400, { error: "Invalid request. Check the fields and retry." }); }
    const { data, error } = await client.rpc("campusfind_workflow", { p_action: parsed.action, p_data: parsed.data });
    if (error) {
      const status = error.code === "42501" ? 403 : ["23505", "22023", "23514", "40001", "40P01"].includes(error.code) ? 409 : 503;
      return reply(status, { error: status === 403 ? "Not permitted." : status === 409 ? "The record changed or this action is unavailable. Reload before retrying." : "Outcome unconfirmed. Reload your records before retrying." });
    }
    return reply(200, data);
  } catch { return reply(503, { error: "Outcome unconfirmed. Reload your records before retrying." }); }
});
