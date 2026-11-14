import type { SupabaseClient } from "@supabase/supabase-js";
import { parseWorkflowRequest, type WorkflowRequest } from "../../../supabase/functions/_shared/validation";
import type { ClaimWithItem, Handover, Contact, WorkflowIssue } from "./types";
import { reportId } from "../reports/validation";
export { campusLocations, issueCategories } from "../../../supabase/functions/_shared/validation";
export const claimFields = "id,item_id,claimant_id,proof_text,owner_proof_text,owner_proof_submitted_at,ownership_verified_at,status,created_at,updated_at";
const withItem = `${claimFields},items!inner(id,reporter_id,type,title,category,location,event_date,description,status,created_at,updated_at)`;
export async function runWorkflow(client: SupabaseClient, input: WorkflowRequest) {
  const request = parseWorkflowRequest(input);
  const { data: identity, error: authError } = await client.auth.getUser();
  if (authError || !identity.user) throw new Error("Your session could not be verified. Sign in again.");
  const { data, error } = await client.functions.invoke("workflow", { body: request });
  if (error || !data?.id) throw new Error("Action could not be confirmed. Reload your records before retrying; a conflicting action may have completed.");
  return data.id as string;
}
export async function listClaims(client: SupabaseClient, userId: string, incoming: boolean, page: number) {
  let query = client.from("claims").select(withItem);
  query = incoming ? query.eq("items.reporter_id", userId) : query.eq("claimant_id", userId);
  const { data, error } = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 20, page * 20);
  if (error) throw new Error("Claims could not be loaded. Please retry.");
  return { claims: (data ?? []).slice(0, 20) as unknown as ClaimWithItem[], hasNext: (data?.length ?? 0) > 20 };
}
export async function getClaim(client: SupabaseClient, id: string) {
  if (!reportId.safeParse(id).success) return null;
  const { data, error } = await client.from("claims").select(withItem).eq("id", id).maybeSingle();
  if (error) throw new Error("Claim could not be loaded.");
  return data as unknown as ClaimWithItem | null;
}
export async function claimCoordination(client: SupabaseClient, id: string) {
  const results = await Promise.all([
    client.from("handovers").select("*").eq("claim_id", id).maybeSingle(),
    client.from("claim_contacts").select("user_id,kind,value,consented_at").eq("claim_id", id),
    client.from("workflow_issues").select("id,claim_id,category,status,reporter_resumed_at,claimant_resumed_at,created_at").eq("claim_id", id).order("created_at", { ascending: false }),
  ]);
  if (results.some(result => result.error)) throw new Error("Return coordination could not be loaded.");
  return { handover: results[0].data as Handover | null, contacts: (results[1].data ?? []) as Contact[], issues: (results[2].data ?? []) as WorkflowIssue[] };
}
