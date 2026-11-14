import { formatCampusDate } from "@/lib/dates";
import { notFound } from "next/navigation";
import { requireUser } from "@/features/auth/server";
import { createClient } from "@/lib/supabase/server";
import { ReportShell } from "@/features/reports/report-ui";
import { issueLabels, issueStatusLabels } from "@/features/workflow/labels";
import { WorkflowButton } from "@/features/workflow/controls";
import { pageNumber } from "@/features/reports/validation";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const user = await requireUser("/admin");
  const page = pageNumber((await searchParams).page);
  const client = await createClient();
  const { data: profile, error: profileError } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError) throw new Error("Role could not be verified.");
  if (profile?.role !== "ADMIN") notFound();
  const [overview, issues] = await Promise.all([
    client.rpc("campusfind_admin_overview"),
    client.from("workflow_issues").select("id,category,status,created_at").neq("status", "RESOLVED").order("created_at", { ascending: false }).order("id").range((page - 1) * 20, page * 20),
  ]);
  if (overview.error || issues.error) throw new Error("Quản trị hệ thống could not be loaded.");
  const summary = overview.data as { items: Record<string, number>; claims: Record<string, number>; open_issues: number };
  return <ReportShell title="Quản trị hệ thống" subtitle="Tổng quan trạng thái và tiếp nhận sự cố. Bằng chứng sở hữu và thông tin liên hệ chỉ dành cho các bên liên quan."><div className="grid gap-5 sm:grid-cols-2">{([['Tin báo', summary.items], ['Yêu cầu nhận đồ', summary.claims]] as const).map(([title, counts]) => <section key={title} className="rounded-3xl border-2 border-border/80 bg-card p-5"><h2 className="text-xl font-semibold">{title}</h2><dl className="mt-4 space-y-2">{Object.entries(counts).map(([status, count]) => <div key={status} className="flex justify-between gap-4"><dt>{status}</dt><dd>{count}</dd></div>)}</dl></section>)}</div><h2 className="mt-8 text-xl font-semibold">Sự cố cần xử lý ({summary.open_issues})</h2><p className="mt-3 text-sm text-muted-foreground">Ghi nhận sự cố tại đây. Cần cả hai bên đồng ý để tiếp tục bàn giao; quản trị viên không tự ý thay người nhận, xem bằng chứng riêng hoặc xác nhận hoàn tất thay các bên.</p><div className="mt-5 space-y-4">{issues.data?.length ? issues.data.slice(0, 20).map(issue => <article key={issue.id} className="rounded-3xl border-2 border-border/80 bg-card p-5"><p className="font-medium">{issueLabels[issue.category] ?? issue.category} · {issueStatusLabels[issue.status as keyof typeof issueStatusLabels]}</p><p className="mt-2 text-sm">Ngày ghi nhận: {formatCampusDate(issue.created_at)}</p>{issue.status === "OPEN" && <div className="mt-3"><WorkflowButton request={{ action: "acknowledge_issue", data: { issue_id: issue.id } }}>Tiếp nhận sự cố</WorkflowButton></div>}</article>) : <p>Không có sự cố chưa xử lý ở trang này.</p>}</div><nav aria-label="Issues pagination" className="mt-6 flex justify-between">{page > 1 ? <Link href={`/admin?page=${page - 1}`}>Trang trước</Link> : <span />}{(issues.data?.length ?? 0) > 20 && <Link href={`/admin?page=${page + 1}`}>Trang sau</Link>}</nav></ReportShell>;
}
