import { Suspense } from "react";
import DiscoveryLoading from "@/features/discovery/discovery-loading";
import { DiscoveryShell, SearchFilters, DiscoveryResults } from "@/features/discovery/discovery-ui";
import { parseDiscoveryFilters, type SearchParameters } from "@/features/discovery/validation";
import { listDiscovery } from "@/features/discovery/services";
import { discoveryContext } from "@/features/discovery/queries";

export const dynamic = "force-dynamic";
async function DiscoveryListing({ searchParams }: { searchParams: Promise<SearchParameters> }) {
  const parsed = parseDiscoveryFilters(await searchParams);
  if (!parsed.ok) return <DiscoveryShell><h1 className="mb-5 text-3xl font-semibold">Find your campus connection</h1><SearchFilters filters={parsed.filters} /><p role="alert" className="rounded-lg border border-destructive/30 bg-white p-5 text-destructive">{parsed.error}</p></DiscoveryShell>;
  const { client, authenticated } = await discoveryContext();
  const results = await listDiscovery(client, parsed.filters);
  return <DiscoveryShell authenticated={authenticated}><div className="mb-7"><p className="mb-2 text-xs font-bold tracking-widest text-primary uppercase">Campus lost &amp; found</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">A little lost. A little found.</h1><p className="mt-3 max-w-2xl text-muted-foreground">Browse active campus reports and help belongings find their way back.</p></div><SearchFilters filters={parsed.filters} /><DiscoveryResults filters={parsed.filters} {...results} /></DiscoveryShell>;
}

export default function Page(props: { searchParams: Promise<SearchParameters> }) {
  return <Suspense fallback={<DiscoveryLoading />}><DiscoveryListing {...props} /></Suspense>;
}
