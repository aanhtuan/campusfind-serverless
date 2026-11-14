import type { SupabaseClient } from "@supabase/supabase-js";
export type ActorLabels = {
  scope_type: "item" | "claim"; scope_id: string;
  reporter_id: string; reporter_display_name: string | null;
  respondent_id: string | null; respondent_display_name: string | null; claim_id: string | null;
};
export function accountCode(id: string) { return `TK#${id.slice(0, 8)}-${id.slice(-4)}`; }
export function actorName(id: string, labels?: ActorLabels | null) {
  return (id === labels?.reporter_id ? labels.reporter_display_name : id === labels?.respondent_id ? labels.respondent_display_name : null)?.trim() || "Thành viên";
}
export function actorText(id: string, labels?: ActorLabels | null, viewerId?: string) {
  return `${actorName(id, labels)}${id === viewerId ? " (Bạn)" : ""} · ${accountCode(id)}`;
}
export async function loadActorLabels(client: SupabaseClient, itemIds: string[] = [], claimIds: string[] = []) {
  if (!itemIds.length && !claimIds.length) return new Map<string, ActorLabels>();
  const { data, error } = await client.rpc("actor_labels", { p_item_ids: [...new Set(itemIds)].slice(0, 40), p_claim_ids: [...new Set(claimIds)].slice(0, 40) });
  // Graceful during rolling releases: known participant IDs still distinguish accounts.
  if (error) return new Map<string, ActorLabels>();
  return new Map((data as ActorLabels[]).map(row => [`${row.scope_type}:${row.scope_id}`, row]));
}
