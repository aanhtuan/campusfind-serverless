import type { SupabaseClient } from "@supabase/supabase-js";
import { createReportSchema, editReportSchema, reportId } from "./validation";
import { PAGE_SIZE, reportFields, type ItemReport } from "./types";

export async function verifiedReporter(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Your session could not be verified. Sign in again and retry.");
  return data.user.id;
}
export async function createReport(client: SupabaseClient, input: unknown) {
  const values = createReportSchema.parse(input);
  await verifiedReporter(client);
  // Database defaults set identity, reporter_id, OPEN status and timestamps.
  const { data, error } = await client.from("items").insert(values).select("id").single();
  if (error || !data) throw new Error("The save could not be confirmed. Check My reports before submitting again.");
  return data.id as string;
}
export async function ownReport(client: SupabaseClient, userId: string, id: string): Promise<ItemReport | null> {
  reportId.parse(id);
  const { data, error } = await client.from("items").select(reportFields).eq("reporter_id", userId).eq("id", id).maybeSingle();
  if (error) throw new Error("Unable to load this report. Please retry.");
  return data as ItemReport | null;
}
export async function ownReports(client: SupabaseClient, userId: string, page: number) {
  const start = (page - 1) * PAGE_SIZE;
  const { data, error } = await client.from("items").select(reportFields)
    .eq("reporter_id", userId).order("created_at", { ascending: false }).order("id", { ascending: false })
    .range(start, start + PAGE_SIZE);
  if (error) throw new Error("Your reports could not be loaded. Please retry.");
  return { reports: (data ?? []).slice(0, PAGE_SIZE) as ItemReport[], hasNext: (data?.length ?? 0) > PAGE_SIZE };
}
export async function updateReport(client: SupabaseClient, id: string, input: unknown) {
  reportId.parse(id);
  const values = editReportSchema.parse(input);
  const userId = await verifiedReporter(client);
  const { data, error } = await client.from("items").update(values).eq("id", id).eq("reporter_id", userId).select("id").maybeSingle();
  if (error || !data) throw new Error("Changes were not confirmed. Reload your report before retrying.");
}
