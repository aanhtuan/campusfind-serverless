import { loadActorLabels } from "@/features/identity/actors";
import { ReportActors } from "@/features/identity/actor-summary";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClaimEntry } from "@/features/workflow/claim-entry";
import { notFound } from "next/navigation";
import { reportId } from "@/features/reports/validation";
import { DiscoveryShell, DiscoveryDetails } from "@/features/discovery/discovery-ui";
import { DiscoveryPhotos } from "@/features/discovery/photo-gallery";
import { discoveryContext } from "@/features/discovery/queries";
import { discoveryItem } from "@/features/discovery/services";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!reportId.safeParse(id).success) notFound();
  const { client, authenticated, userId } = await discoveryContext();
  const item = await discoveryItem(client, id);
  if (!item) notFound();
  const labels = userId ? (await loadActorLabels(client, [id])).get(`item:${id}`) : undefined;

  return (
    <DiscoveryShell authenticated={authenticated}>
      <div className="mb-6">
        <Link
          href="/items"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          <span>Quay lại bảng tin đồ thất lạc</span>
        </Link>
      </div>
      <DiscoveryDetails item={item} />
      <ReportActors item={item} labels={labels} viewerId={userId ?? undefined} />
      <ClaimEntry client={client} item={item} userId={userId} />
      <DiscoveryPhotos itemId={item.id} />
    </DiscoveryShell>
  );
}
