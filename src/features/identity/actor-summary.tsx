import Link from "next/link";
import { ArrowRight, Clock, Sparkles, User } from "lucide-react";
import { coordinationProgress } from "./progress";
import type { Handover, WorkflowIssue } from "../workflow/types";
import { actorText, type ActorLabels } from "./actors";
import type { ClaimWithItem } from "@/features/workflow/types";
import { participants } from "../workflow/participants";

export function ReportActors({
  item,
  labels,
  viewerId,
}: {
  item: { id: string; type: string; reporter_id?: string; status: string };
  labels?: ActorLabels;
  viewerId?: string;
}) {
  const reporterId = labels?.reporter_id ?? item.reporter_id;
  if (!reporterId) return null;
  const lost = item.type === "LOST";
  const done = item.status === "RESOLVED" || item.status === "CLOSED";

  return (
    <div className="mt-4 space-y-2.5 rounded-2xl border-2 border-border/80 bg-secondary/35 p-4 text-sm [overflow-wrap:anywhere] shadow-2xs">
      <div className="flex items-start gap-2">
        <User className="size-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p>
            <span className="font-semibold">Người đăng tin:</span>{" "}
            {actorText(reporterId, labels, viewerId)}
          </p>
          <p className="text-xs text-muted-foreground">
            {lost
              ? done
                ? "Báo mất · đã nhận lại đồ"
                : "Báo mất · người nhận lại dự kiến"
              : done
              ? "Báo nhặt · đã giao đồ"
              : "Báo nhặt · người giữ và giao đồ"}
          </p>
        </div>
      </div>

      {labels && !labels.respondent_id && reporterId === viewerId && !done && (
        <p className="text-xs text-muted-foreground pl-6">
          {lost
            ? "Chưa chọn phản hồi nhặt được để xác minh."
            : "Chưa duyệt tài khoản nhận đồ."}
        </p>
      )}

      {labels?.respondent_id && (
        <div className="border-t border-border/60 pt-3 pl-6 space-y-2">
          <p>
            <span className="font-semibold">
              {lost
                ? "Người nhặt được / giao đồ"
                : item.status === "RESOLVED" || item.status === "CLOSED"
                ? "Người đã nhận đồ"
                : "Người được duyệt nhận"}
              :
            </span>{" "}
            {actorText(labels.respondent_id, labels, viewerId)}
          </p>
          <div>
            <Link
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-border/80 bg-card px-3 py-1.5 text-xs font-bold text-primary shadow-2xs transition-all hover:border-primary hover:bg-primary/5 active:translate-y-0.5 min-h-11 underline"
              href={`/claims/${labels.claim_id}`}
            >
              <span>Xem hai bên & tiến độ bàn giao</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function ClaimActors({
  claim,
  viewerId,
  coordination,
}: {
  claim: ClaimWithItem;
  viewerId: string;
  coordination?: { handover: Handover | null; issues: WorkflowIssue[] } | null;
}) {
  const { holderId, ownerId, lost } = participants(claim);
  const done = claim.items.status === "RESOLVED" || claim.items.status === "CLOSED";
  const stopped = claim.status === "REJECTED" || claim.status === "CANCELLED";
  const who = (id: string) => actorText(id, claim.actors, viewerId);

  let next = coordination
    ? coordinationProgress(claim, coordination.handover, coordination.issues, viewerId)
    : "Xem chi tiết để thống nhất lịch hẹn và theo dõi xác nhận của hai bên.";

  if (stopped) next = "Yêu cầu này đã kết thúc, không có bàn giao theo yêu cầu này.";
  else if (done) next = "Đã hoàn tất trao trả. Xem xác nhận của hai bên bên dưới.";
  else if (claim.status === "PENDING") next = `Chờ người đăng tin xét duyệt: ${who(claim.items.reporter_id)}.`;
  else if (lost && !claim.owner_proof_submitted_at) next = `Chờ người báo mất gửi bằng chứng: ${who(ownerId)}.`;
  else if (lost && !claim.ownership_verified_at) next = `Chờ người giữ đồ xác minh bằng chứng: ${who(holderId)}.`;

  return (
    <section
      aria-label="Tài khoản và vai trò"
      className="space-y-3 rounded-2xl border-2 border-border/80 bg-secondary/30 p-4 text-sm [overflow-wrap:anywhere] shadow-2xs"
    >
      <div className="flex flex-col gap-1.5">
        <p className="flex items-center gap-2">
          <User className="size-3.5 text-primary shrink-0" />
          <span>
            <strong>Người đăng tin:</strong> {who(claim.items.reporter_id)}
          </span>
        </p>
        <p className="flex items-center gap-2">
          <User className="size-3.5 text-amber-600 shrink-0" />
          <span>
            <strong>{lost ? "Người phản hồi nhặt được" : "Người yêu cầu nhận"}:</strong> {who(claim.claimant_id)}
          </span>
        </p>
      </div>

      {!stopped && (
        <div className="space-y-1.5 border-t border-border/70 pt-2.5 text-xs text-foreground/90">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="size-3 text-amber-500" />
            <span>{done ? "Vai trò trao trả" : "Vai trò dự kiến · chưa hoàn tất bàn giao"}</span>
          </p>
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <p className="rounded-xl border border-border/70 bg-card px-2.5 py-1.5">
              <strong>Giao đồ:</strong> {who(holderId)}
            </p>
            <p className="rounded-xl border border-border/70 bg-card px-2.5 py-1.5">
              <strong>Nhận đồ:</strong> {who(ownerId)}
            </p>
          </div>
        </div>
      )}

      <div className="border-t border-border/70 pt-2.5 flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
        <Clock className="size-3.5 text-primary shrink-0 mt-0.5" />
        <p>{next}</p>
      </div>
    </section>
  );
}
