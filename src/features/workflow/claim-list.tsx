import { formatCampusDate } from "@/lib/dates";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileSearch,
  Inbox,
  Send,
  Sparkles,
} from "lucide-react";
import { requireUser } from "@/features/auth/server";
import { createClient } from "@/lib/supabase/server";
import { pageNumber } from "@/features/reports/validation";
import { ReportShell } from "@/features/reports/report-ui";
import { Button } from "@/components/ui/button";
import { TypeBadge, WorkflowBadge } from "@/components/ui/badge";
import { loadActorLabels } from "@/features/identity/actors";
import { ClaimActors } from "@/features/identity/actor-summary";
import { workflowStatusLabel } from "./labels";
import { listClaims } from "./services";

export async function ClaimList({
  incoming,
  rawPage,
}: {
  incoming: boolean;
  rawPage: string | string[] | undefined;
}) {
  const path = incoming ? "/incoming-claims" : "/my-claims";
  const user = await requireUser(path);
  const page = pageNumber(rawPage);
  const client = await createClient();
  const { claims, hasNext } = await listClaims(client, user.id, incoming, page);
  const labels = await loadActorLabels(
    client,
    [],
    claims.map((claim) => claim.id)
  );

  return (
    <ReportShell
      title={incoming ? "Yêu cầu & phản hồi gửi đến" : "Yêu cầu & phản hồi của tôi"}
      subtitle={
        incoming
          ? "Xét duyệt các phản hồi nhặt được và yêu cầu nhận đồ từ các thành viên khác gửi đến tin báo của bạn."
          : "Theo dõi tiến trình xét duyệt, gửi bằng chứng xác minh và phối hợp bàn giao tại trường học."
      }
    >
      {/* Switcher Tabs: Incoming vs Outgoing */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div className="inline-flex rounded-2xl border-2 border-border/80 bg-card p-1.5 shadow-[2px_2px_0px_0px_rgba(17,24,39,0.06)]">
          <Link
            href="/incoming-claims"
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
              incoming
                ? "bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_rgba(79,70,229,0.3)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Inbox className="size-4" />
            <span>Phản hồi gửi đến tôi</span>
          </Link>
          <Link
            href="/my-claims"
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
              !incoming
                ? "bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_rgba(79,70,229,0.3)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Send className="size-4" />
            <span>Yêu cầu tôi đã gửi</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Sparkles className="size-3.5 text-amber-500" />
          <span>{claims.length} mục ở trang {page}</span>
        </div>
      </div>

      {/* Main Grid or Empty State */}
      {claims.length ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {claims.map((claim) => {
            const isFound = claim.items.type === "FOUND";
            const statusLabel = workflowStatusLabel(claim);
            const isCompleted =
              claim.status === "APPROVED" &&
              ["RESOLVED", "CLOSED"].includes(claim.items.status);
            const isPending = claim.status === "PENDING";
            const isApproved = claim.status === "APPROVED";

            return (
              <article
                key={claim.id}
                className="group flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-border/80 bg-card p-6 shadow-[4px_4px_0px_0px_rgba(17,24,39,0.06)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[6px_6px_0px_0px_rgba(79,70,229,0.18)]"
              >
                <div>
                  {/* Badges Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3.5">
                    <TypeBadge type={claim.items.type} />
                    <WorkflowBadge status={claim.status} label={statusLabel} />
                  </div>

                  {/* Title */}
                  <h2 className="mt-4 text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-xl [overflow-wrap:anywhere]">
                    <Link
                      href={`/claims/${claim.id}`}
                      className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:ring-ring"
                    >
                      {claim.items.title}
                    </Link>
                  </h2>

                  {/* Actor & Progress Context */}
                  <div className="mt-4">
                    <ClaimActors
                      claim={{
                        ...claim,
                        actors: labels.get(`claim:${claim.id}`),
                      }}
                      viewerId={user.id}
                    />
                  </div>

                  {/* Meta Dates */}
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar className="size-3.5 text-primary" />
                      <span>Ngày gửi:</span>
                      <time dateTime={claim.created_at} className="font-semibold text-foreground">
                        {formatCampusDate(claim.created_at)}
                      </time>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="size-3.5 text-amber-600" />
                      <span>Cập nhật:</span>
                      <span className="font-semibold text-foreground">
                        {formatCampusDate(claim.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action CTA */}
                <div className="mt-6 border-t border-border/60 pt-4">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary"
                  >
                    <Link href={`/claims/${claim.id}`} className="gap-2">
                      <span>
                        {isCompleted
                          ? "Xem lịch sử trao trả"
                          : isPending
                          ? incoming
                            ? "Xét duyệt phản hồi / yêu cầu"
                            : "Xem hoặc hủy yêu cầu"
                          : isApproved
                          ? !isFound && !claim.ownership_verified_at
                            ? "Xác minh chủ đồ"
                            : "Thống nhất bàn giao"
                          : "Xem kết quả"}
                      </span>
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/80 bg-card px-6 py-16 text-center shadow-[3px_3px_0px_0px_rgba(17,24,39,0.04)]">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary shadow-2xs">
            {incoming ? (
              <Inbox className="size-8" />
            ) : (
              <FileSearch className="size-8" />
            )}
          </div>
          <h3 className="mt-5 text-xl font-bold text-foreground">
            {page > 1
              ? "Không có yêu cầu nào ở trang này"
              : incoming
              ? "Chưa có phản hồi hoặc yêu cầu nào gửi đến"
              : "Bạn chưa gửi yêu cầu hoặc phản hồi nào"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
            {incoming
              ? "Khi có thành viên khác báo nhặt được món đồ bạn làm mất, hoặc yêu cầu nhận lại đồ bạn đang giữ, thông tin chi tiết sẽ xuất hiện ngay tại đây."
              : "Khi thấy tin báo đồ thất lạc hoặc nhặt được trên bảng tin, bạn có thể gửi phản hồi riêng tư để kết nối và trao đổi bàn giao an toàn."}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {page > 1 ? (
              <Button asChild variant="outline">
                <Link href={path}>Quay về trang 1</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/items" className="gap-2">
                  <FileSearch className="size-4" />
                  <span>Duyệt bảng tin đồ thất lạc</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      <nav
        aria-label="Phân trang yêu cầu và phản hồi"
        className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4"
      >
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`${path}?page=${page - 1}`} className="gap-1.5">
              <ChevronLeft className="size-4" />
              <span>Trang trước</span>
            </Link>
          </Button>
        ) : (
          <div />
        )}

        <span className="text-xs font-semibold text-muted-foreground">
          Trang {page}
        </span>

        {hasNext ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`${path}?page=${page + 1}`} className="gap-1.5">
              <span>Trang sau</span>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <div />
        )}
      </nav>
    </ReportShell>
  );
}
