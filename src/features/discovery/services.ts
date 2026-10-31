import type { SupabaseClient } from "@supabase/supabase-js";
import type { ItemReport, ItemPhoto } from "../reports/types";
import { photoFields } from "../reports/types";
import { reportId } from "../reports/validation";
import { discoveryFiltersSchema, escapeLike, type DiscoveryFilters } from "./validation";

export const DISCOVERY_PAGE_SIZE = 12;
export const summaryFields = "id,type,title,category,location,event_date,status";
export const detailFields = `${summaryFields},description,created_at`;
export type DiscoverySummary = Pick<ItemReport, "id" | "type" | "title" | "category" | "location" | "event_date" | "status">;
export type DiscoveryItem = DiscoverySummary & Pick<ItemReport, "description" | "created_at">;

export async function listDiscovery(client: SupabaseClient, input: DiscoveryFilters) {
  const filters = discoveryFiltersSchema.parse(input);
  let query = client.from("items").select(summaryFields).in("status", ["OPEN", "IN_PROGRESS"]);
  // Direct scalar filters are URL-encoded by the SDK. Never interpolate input
  // into a raw PostgREST .or() expression. Wildcards are literal user text.
  if (filters.q) query = query.ilike("title", `%${escapeLike(filters.q)}%`);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.location) query = query.ilike("location", `%${escapeLike(filters.location)}%`);
  const start = (filters.page - 1) * DISCOVERY_PAGE_SIZE;
  const { data, error } = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).range(start, start + DISCOVERY_PAGE_SIZE);
  if (error) throw new Error("Items could not be loaded. Please try again.");
  return { items: (data ?? []).slice(0, DISCOVERY_PAGE_SIZE) as DiscoverySummary[], hasNext: (data?.length ?? 0) > DISCOVERY_PAGE_SIZE };
}
export async function discoveryItem(client: SupabaseClient, id: string): Promise<DiscoveryItem | null> {
  if (!reportId.safeParse(id).success) return null;
  // Discovery stays public-text-only even for owners. Terminal owner reports
  // belong to protected /my-reports, not this public page after session loss.
  const { data, error } = await client.from("items").select(detailFields).eq("id", id).in("status", ["OPEN", "IN_PROGRESS"]).maybeSingle();
  if (error) throw new Error("This item could not be loaded. Please try again.");
  return data as DiscoveryItem | null;
}
export async function visiblePhotos(client: SupabaseClient, id: string): Promise<ItemPhoto[]> {
  reportId.parse(id);
  const { data, error } = await client.from("item_images").select(photoFields).eq("item_id", id).order("image_slot").limit(3);
  if (error) throw new Error("Photos are unavailable for this session.");
  return (data ?? []) as ItemPhoto[];
}
