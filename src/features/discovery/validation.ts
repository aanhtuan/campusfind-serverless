import { z } from "zod";

const text = (max: number) => z.string().max(max).refine(value => !/[\u0000-\u001f\u007f]/.test(value), "Use ordinary text without control characters.").transform(value => value.trim());
// PostgREST treats * as a LIKE wildcard alias. Reject it rather than silently
// widening a literal contains search; %, _ and backslash are escaped below.
const searchText = (max: number) => text(max).refine(value => !value.includes("*"), "Use words rather than * wildcards.");
export const discoveryFiltersSchema = z.object({
  q: searchText(120).default(""),
  type: z.enum(["", "LOST", "FOUND"]).default(""),
  category: text(80).default(""),
  location: searchText(200).default(""),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export type DiscoveryFilters = z.infer<typeof discoveryFiltersSchema>;
export type SearchParameters = Record<string, string | string[] | undefined>;
export const emptyFilters: DiscoveryFilters = { q: "", type: "", category: "", location: "", page: 1 };

export function parseDiscoveryFilters(params: SearchParameters) {
  const values: Record<string, string> = {};
  for (const field of ["q", "type", "category", "location", "page"]) {
    const value = params[field];
    if (Array.isArray(value)) return { ok: false as const, filters: { ...emptyFilters }, error: "Each search filter must appear only once." };
    if (value !== undefined) values[field] = value;
  }
  if (values.page !== undefined && !/^[1-9]\d{0,4}$/.test(values.page)) return { ok: false as const, filters: { ...emptyFilters }, error: "Choose a valid page between 1 and 10000." };
  const parsed = discoveryFiltersSchema.safeParse(values);
  return parsed.success ? { ok: true as const, filters: parsed.data } : { ok: false as const, filters: { ...emptyFilters }, error: "Check your filters: search up to 120 characters, category 80, location 200, and a valid type/page. Use ordinary text without * wildcards or control characters." };
}
export function discoveryUrl(filters: DiscoveryFilters, page = 1) {
  const params = new URLSearchParams();
  for (const key of ["q", "type", "category", "location"] as const) if (filters[key]) params.set(key, filters[key]);
  if (page > 1) params.set("page", String(page));
  return `/items${params.size ? `?${params}` : ""}`;
}
export function escapeLike(value: string) { return value.replace(/[\\%_]/g, char => `\\${char}`); }
