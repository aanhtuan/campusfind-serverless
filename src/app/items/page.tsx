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
  return (
    <DiscoveryShell authenticated={authenticated}>
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <span>Khuôn viên đại học</span>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Bảng tin đồ thất lạc
        </h1>
        <p className="mt-2.5 max-w-2xl text-base text-muted-foreground leading-relaxed">
          Tra cứu các tin báo mất hoặc nhặt được đồ trong toàn trường. Cùng chung tay giúp mọi đồ vật trở về với đúng chủ nhân.
        </p>
      </div>
      <SearchFilters filters={parsed.filters} />
      <DiscoveryResults filters={parsed.filters} {...results} />
    </DiscoveryShell>
  );
}

export default function Page(props: { searchParams: Promise<SearchParameters> }) {
  return <Suspense fallback={<DiscoveryLoading />}><DiscoveryListing {...props} /></Suspense>;
}
