import Link from "next/link";
import { requireUser } from "@/features/auth/server";
import { createClient } from "@/lib/supabase/server";
import { ownReports } from "@/features/reports/services";
import { pageNumber } from "@/features/reports/validation";
import { ReportCard, ReportShell } from "@/features/reports/report-ui";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const page = pageNumber((await searchParams).page);
  const user = await requireUser(`/my-reports?page=${page}`);
  const { reports, hasNext } = await ownReports(await createClient(), user.id, page);
  return <ReportShell title="My reports" subtitle="Your lost and found reports, including resolved and closed records.">
    {reports.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{reports.map(report => <ReportCard key={report.id} report={report} />)}</div> : <div className="rounded-xl border border-dashed border-primary/25 bg-white px-5 py-12 text-center"><h2 className="text-xl font-semibold">{page === 1 ? "No reports yet" : "No reports on this page"}</h2><p className="mt-3 text-muted-foreground">{page === 1 ? "Create a report to help your campus community reconnect with their belongings." : "Go back to see your earlier pages."}</p>{page === 1 && <Button asChild className="mt-6"><Link href="/items/new">Create your first report</Link></Button>}</div>}
    <nav aria-label="My reports pagination" className="mt-7 flex flex-wrap items-center justify-between gap-3">{page > 1 ? <Button asChild variant="outline"><Link href={`/my-reports?page=${page - 1}`}>Previous</Link></Button> : <span />}<span className="text-sm text-muted-foreground">Page {page}</span>{hasNext ? <Button asChild variant="outline"><Link href={`/my-reports?page=${page + 1}`}>Next</Link></Button> : <span />}</nav>
  </ReportShell>;
}
