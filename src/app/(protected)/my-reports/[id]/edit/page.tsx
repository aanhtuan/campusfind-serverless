import { requireOwnedReport } from "@/features/reports/queries";
import { ReportForm } from "@/features/reports/report-form";
import { ReportShell } from "@/features/reports/report-ui";

export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { report } = await requireOwnedReport(id, `/my-reports/${id}/edit`);
  return <ReportShell title="Edit report" subtitle="Keep the details accurate. Report type, ownership and status remain unchanged."><ReportForm report={report} /></ReportShell>;
}
