import { loadActorLabels } from "@/features/identity/actors";
import { ReportActors } from "@/features/identity/actor-summary";
import Link from "next/link";
import { ArrowLeft, Calendar, Edit3, MapPin, Tag } from "lucide-react";
import { WorkflowButton } from "@/features/workflow/controls";
import { Button } from "@/components/ui/button";
import { requireOwnedReport } from "@/features/reports/queries";
import { ReportShell } from "@/features/reports/report-ui";
import { PhotoManager } from "@/features/reports/photo-manager";
import { photoFields, type ItemPhoto } from "@/features/reports/types";
import { TypeBadge, StatusBadge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, client, report } = await requireOwnedReport(id, `/my-reports/${id}`);
  const { data: photos, error } = await client
    .from("item_images")
    .select(photoFields)
    .eq("item_id", report.id)
    .order("image_slot");

  if (error) throw new Error("Unable to load report photos.");

  const labels = (await loadActorLabels(client, [id])).get(`item:${id}`);
  const isLost = report.type === "LOST";
  const selected = isLost && report.status === "OPEN" ? await client.from("claims").select("id").eq("item_id", report.id).eq("status", "APPROVED").maybeSingle() : null;
  if (selected?.error) throw new Error("Unable to load response status.");

  return (
    <ReportShell
      title="Chi tiết & Quản lý tin báo"
      subtitle="Cập nhật nội dung mô tả hoặc quản lý ảnh đính kèm cho tin báo của bạn."
    >
      <div className="mb-6">
        <Link
          href="/my-reports"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          <span>Quay lại danh sách của tôi</span>
        </Link>
      </div>

      <article className="rounded-3xl border-2 border-border/80 bg-card p-6 shadow-[4px_4px_0px_0px_rgba(17,24,39,0.06)] sm:p-8">
        {/* Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <TypeBadge type={report.type} />
            <StatusBadge status={report.status} />
          </div>
          <span className="text-xs text-muted-foreground">Mã tin: #{report.id.slice(0, 8)}</span>
        </div>

        {/* Title */}
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl [overflow-wrap:anywhere]">
          {report.title}
        </h2>

        <ReportActors item={report} labels={labels} viewerId={user.id} />

        {/* Meta Grid */}
        <dl className="mt-6 grid gap-4 rounded-2xl bg-secondary/40 p-4 sm:grid-cols-3 sm:p-5">
          <div>
            <dt className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <Tag className="size-3 text-primary" />
              <span>Danh mục</span>
            </dt>
            <dd className="mt-1 font-bold text-foreground break-words">{report.category}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <MapPin className="size-3 text-amber-700" />
              <span>Khu vực trên campus</span>
            </dt>
            <dd className="mt-1 font-bold text-foreground break-words">{report.location}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <Calendar className="size-3 text-emerald-700" />
              <span>{isLost ? "Ngày làm mất" : "Ngày nhặt được"}</span>
            </dt>
            <dd className="mt-1 font-bold text-foreground">
              <time dateTime={report.event_date}>{report.event_date}</time>
            </dd>
          </div>
        </dl>

        {/* Description */}
        <div className="mt-6">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Mô tả chi tiết
          </h3>
          <div className="mt-2 rounded-2xl border border-border/60 bg-muted/30 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
              {report.description || "Không có mô tả chi tiết."}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 border-t border-border/60 pt-5">
          <Button asChild variant="outline" className="gap-2">
            <Link href={`/my-reports/${report.id}/edit`}>
              <Edit3 className="size-4" />
              <span>Chỉnh sửa thông tin tin báo</span>
            </Link>
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="outline"><Link href="/incoming-claims">{isLost ? "Xem phản hồi nhặt được & Theo dõi bàn giao" : "Xét duyệt yêu cầu & Theo dõi bàn giao"}</Link></Button>
          {isLost && report.status === "OPEN" && !selected?.data && <WorkflowButton request={{ action: "resolve_lost", data: { item_id: report.id } }}>Tôi đã tìm lại được đồ</WorkflowButton>}
          {report.status === "RESOLVED" && <WorkflowButton request={{ action: "close_report", data: { item_id: report.id } }}>Đóng tin đã hoàn tất</WorkflowButton>}
        </div>
      </article>

      {/* Photo Manager Component */}
      <PhotoManager itemId={report.id} ownerId={user.id} photos={(photos ?? []) as ItemPhoto[]} />
    </ReportShell>
  );
}
