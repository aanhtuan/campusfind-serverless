import { requireUser } from "@/features/auth/server";
import { ReportForm } from "@/features/reports/report-form";
import { ReportShell } from "@/features/reports/report-ui";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireUser("/items/new");
  return <ReportShell title="Report an item" subtitle="Lost something or found something on campus? Start with the details. Photos are optional after saving."><ReportForm /></ReportShell>;
}
