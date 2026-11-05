import { requireUser } from "@/features/auth/server";
import { ReportForm } from "@/features/reports/report-form";
import { ReportShell } from "@/features/reports/report-ui";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireUser("/items/new");
  return (
    <ReportShell
      title="Báo mất hoặc nhặt được đồ"
      subtitle="Bạn vừa để quên đồ hay nhặt được tài sản trong trường? Hãy điền thông tin bên dưới để cộng đồng cùng hỗ trợ."
    >
      <ReportForm />
    </ReportShell>
  );
}
