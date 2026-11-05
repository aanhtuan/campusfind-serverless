import { requireOwnedReport } from "@/features/reports/queries";
import { ReportForm } from "@/features/reports/report-form";
import { ReportShell } from "@/features/reports/report-ui";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { report } = await requireOwnedReport(id, `/my-reports/${id}/edit`);

  return (
    <ReportShell
      title="Chỉnh sửa tin báo"
      subtitle="Giữ thông tin luôn chính xác để việc kết nối thuận tiện nhất. Loại tin báo và người sở hữu không thay đổi."
    >
      <ReportForm report={report} />
    </ReportShell>
  );
}
