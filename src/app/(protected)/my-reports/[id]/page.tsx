import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireOwnedReport } from "@/features/reports/queries";
import { ReportShell, StatusBadge } from "@/features/reports/report-ui";
import { PhotoManager } from "@/features/reports/photo-manager";
import { photoFields, type ItemPhoto } from "@/features/reports/types";

export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, client, report } = await requireOwnedReport(id, `/my-reports/${id}`);
  const { data: photos, error } = await client.from("item_images").select(photoFields).eq("item_id", report.id).order("image_slot");
  if (error) throw new Error("Unable to load report photos.");
  return <ReportShell title="Manage your report" subtitle="Update the details and photos for your campus report.">
    <article className="rounded-xl border border-primary/15 bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center gap-3"><span className="text-sm font-bold text-primary">{report.type}</span><StatusBadge status={report.status} /></div>
      <h2 className="mt-4 text-2xl font-semibold [overflow-wrap:anywhere]">{report.title}</h2>
      <dl className="mt-6 grid gap-5 sm:grid-cols-3"><div><dt className="text-sm text-muted-foreground">Category</dt><dd className="break-words font-medium">{report.category}</dd></div><div><dt className="text-sm text-muted-foreground">Campus location</dt><dd className="break-words font-medium">{report.location}</dd></div><div><dt className="text-sm text-muted-foreground">{report.type === "LOST" ? "Lost on" : "Found on"}</dt><dd className="font-medium"><time dateTime={report.event_date}>{report.event_date}</time></dd></div></dl>
      <h3 className="mt-6 font-medium">Description</h3><p className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere] text-muted-foreground">{report.description || "No description provided."}</p>
      <Button asChild variant="outline" className="mt-6"><Link href={`/my-reports/${report.id}/edit`}>Edit report details</Link></Button>
    </article><PhotoManager itemId={report.id} ownerId={user.id} photos={(photos ?? []) as ItemPhoto[]} />
  </ReportShell>;
}
