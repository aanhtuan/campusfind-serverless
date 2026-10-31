import Link from "next/link";
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
  const { client, authenticated } = await discoveryContext();
  const item = await discoveryItem(client, id);
  if (!item) notFound();
  return <DiscoveryShell authenticated={authenticated}><Link href="/items" className="mb-5 inline-flex min-h-11 items-center text-sm text-primary underline">Back to all items</Link><DiscoveryDetails item={item} /><DiscoveryPhotos itemId={item.id} /></DiscoveryShell>;
}
