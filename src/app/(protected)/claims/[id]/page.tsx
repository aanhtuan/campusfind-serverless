import { formatCampusDate } from "@/lib/dates";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Info,
  Lock,
  MapPin,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { requireUser } from "@/features/auth/server";
import { createClient } from "@/lib/supabase/server";
import { ReportShell } from "@/features/reports/report-ui";
import { TypeBadge, StatusBadge, WorkflowBadge } from "@/components/ui/badge";
import { getClaim, claimCoordination } from "@/features/workflow/services";
import { WorkflowButton } from "@/features/workflow/controls";
import { workflowStatusLabel } from "@/features/workflow/labels";
import { OwnerVerification } from "@/features/workflow/owner-verification";
import { participants } from "@/features/workflow/participants";
import { Coordination } from "@/features/workflow/coordination";
import { loadActorLabels } from "@/features/identity/actors";
import { ClaimActors } from "@/features/identity/actor-summary";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/claims/${id}`);
  const client = await createClient();
  const claim = await getClaim(client, id);
  if (!claim) notFound();

  claim.actors = (await loadActorLabels(client, [], [id])).get(`claim:${id}`);
  const reporter = claim.items.reporter_id === user.id;
  const { lost, verified } = participants(claim);
  const coordination =
    claim.status === "APPROVED" && verified
      ? await claimCoordination(client, id)
      : null;

  const backUrl = reporter ? "/incoming-claims" : "/my-claims";
  const backLabel = reporter
    ? "Quay lại danh sách phản hồi gửi đến"
    : "Quay lại danh sách yêu cầu của tôi";

  return (
    <ReportShell
      title={claim.items.title}
      subtitle="Bằng chứng, kết quả xét duyệt và lịch sử bàn giao"
    >
      {/* Breadcrumb Navigation */}
      <div className="mb-6">
        <Link
          href={backUrl}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-secondary/70 sm:text-sm"
        >
          <ArrowLeft className="size-4" />
          <span>{backLabel}</span>
        </Link>
      </div>

      {/* Main Claim Detail Card */}
      <article className="rounded-3xl border-2 border-border/80 bg-card p-6 shadow-[4px_4px_0px_0px_rgba(17,24,39,0.06)] sm:p-8">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={claim.items.type} />
            <StatusBadge status={claim.items.status} />
          </div>
          <WorkflowBadge
            status={claim.status}
            label={workflowStatusLabel(claim)}
          />
        </div>

        {/* Title */}
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl [overflow-wrap:anywhere]">
          {claim.items.title}
        </h1>

        {/* Date Meta Row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium">
            <Calendar className="size-3.5 text-primary" />
            <span>Ngày gửi:</span>
            <time dateTime={claim.created_at} className="font-semibold text-foreground">
              {formatCampusDate(claim.created_at)}
            </time>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="size-3.5 text-amber-600" />
            <span>Cập nhật kết quả:</span>
            <span className="font-semibold text-foreground">
              {formatCampusDate(claim.updated_at)}
            </span>
          </div>
        </div>

        {/* Actor Progress Component */}
        <div className="mt-5">
          <ClaimActors
            claim={claim}
            viewerId={user.id}
            coordination={coordination}
          />
        </div>

        {/* Private Proof Box */}
        <div className="mt-6 rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 pb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Lock className="size-4 text-primary" />
              <span>
                {lost
                  ? "Phản hồi nhặt được đồ riêng tư"
                  : "Bằng chứng sở hữu riêng tư"}
              </span>
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <ShieldCheck className="size-3" />
              <span>Chỉ hai bên được xem</span>
            </span>
          </div>

          <p className="mt-3.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">
            {claim.proof_text}
          </p>
        </div>

        {/* Action Buttons for Pending State */}
        {claim.status === "PENDING" && (
          <div className="mt-6 rounded-2xl border-2 border-amber-300/80 bg-amber-50/70 p-5 text-amber-950 shadow-2xs">
            <h3 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
              <Info className="size-4 text-amber-700" />
              <span>Hành động xét duyệt</span>
            </h3>

            <div className="mt-4 flex flex-wrap gap-3">
              {reporter ? (
                <>
                  <WorkflowButton
                    variant="default"
                    request={{
                      action: "review_claim",
                      data: { claim_id: id, decision: "APPROVED" },
                    }}
                  >
                    {lost ? "Có thể là đồ của tôi" : "Chấp thuận yêu cầu nhận đồ"}
                  </WorkflowButton>
                  <WorkflowButton
                    variant="outline"
                    request={{
                      action: "review_claim",
                      data: { claim_id: id, decision: "REJECTED" },
                    }}
                  >
                    {lost ? "Không phải đồ của tôi" : "Từ chối yêu cầu"}
                  </WorkflowButton>
                </>
              ) : (
                <WorkflowButton
                  variant="outline"
                  request={{ action: "cancel_claim", data: { claim_id: id } }}
                >
                  {lost ? "Hủy phản hồi đang chờ" : "Hủy yêu cầu đang chờ"}
                </WorkflowButton>
              )}
            </div>

            {reporter && (
              <p className="mt-3.5 text-xs leading-relaxed text-amber-900/90 border-t border-amber-200/80 pt-3">
                {lost
                  ? "Chọn phản hồi này sẽ từ chối các phản hồi khác đang chờ. Tiếp theo, bạn cần gửi bằng chứng riêng để người đang giữ đồ xác minh; việc chọn chưa xác nhận quyền sở hữu hay bàn giao."
                  : "Chấp thuận yêu cầu này sẽ từ chối các yêu cầu khác đang chờ và bắt đầu phối hợp bàn giao. Thao tác này chưa xác nhận món đồ đã được trao lại."}
              </p>
            )}
          </div>
        )}

        {/* Owner Proof Box if submitted */}
        {lost &&
          claim.owner_proof_text &&
          (claim.status !== "APPROVED" || verified) && (
            <section className="mt-6 rounded-2xl border-2 border-border/80 bg-muted/40 p-5 sm:p-6">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span>Bằng chứng riêng của người báo mất</span>
              </h2>
              <p className="mt-3.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">
                {claim.owner_proof_text}
              </p>
            </section>
          )}

        {/* Related Item Information (Collapsible Card) */}
        <details className="mt-6 rounded-2xl border-2 border-border/80 bg-muted/30 p-4 transition-all">
          <summary className="cursor-pointer font-bold text-sm text-foreground flex items-center gap-2 select-none">
            <FileText className="size-4 text-primary" />
            <span>Thông tin món đồ liên quan</span>
          </summary>
          <div className="mt-3.5 space-y-3 border-t border-border/60 pt-3 text-sm">
            <p className="whitespace-pre-wrap leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
              {claim.items.description || "Không có mô tả chi tiết."}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <Tag className="size-3 text-primary" />
                {claim.items.category}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <MapPin className="size-3 text-amber-600" />
                {claim.items.location}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <Calendar className="size-3 text-emerald-600" />
                {claim.items.event_date}
              </span>
            </div>
          </div>
        </details>

        {/* Quick Links */}
        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-border/60 pt-4 text-xs font-semibold">
          {reporter && (
            <Link
              href={`/my-reports/${claim.item_id}`}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <span>Quản lý tin báo liên quan</span>
              <ExternalLink className="size-3" />
            </Link>
          )}
          {["OPEN", "IN_PROGRESS"].includes(claim.items.status) && (
            <Link
              href={`/items/${claim.item_id}`}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <span>Xem tin công khai</span>
              <ExternalLink className="size-3" />
            </Link>
          )}
        </div>
      </article>

      {/* Step 2: Owner Verification Component */}
      {lost && claim.status === "APPROVED" && !verified && (
        <OwnerVerification claim={claim} reporter={reporter} />
      )}

      {/* Verified Banner */}
      {lost && verified && (
        <div className="mt-6 flex items-center gap-2.5 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-950 shadow-2xs">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <span>
            Người giữ đồ đã đối chiếu bằng chứng sở hữu. Chỉ hoàn tất khi hai bên xác nhận bàn giao.
          </span>
        </div>
      )}

      {/* Step 3: Coordination Component */}
      {coordination && (
        <Coordination claim={claim} userId={user.id} {...coordination} />
      )}
    </ReportShell>
  );
}
