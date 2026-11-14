import type { ClaimWithItem, Handover, WorkflowIssue } from "../workflow/types";
import { participants } from "../workflow/participants";
import { actorText } from "./actors";
export function coordinationProgress(claim: ClaimWithItem, handover: Handover | null, issues: WorkflowIssue[], viewerId: string) {
  const who = (id: string) => actorText(id, claim.actors, viewerId);
  const open = issues.find(issue => issue.status !== "RESOLVED");
  if (open) {
    const waiting = [!open.reporter_resumed_at && claim.items.reporter_id, !open.claimant_resumed_at && claim.claimant_id].filter((id): id is string => Boolean(id));
    return `Tạm dừng do sự cố. Chờ đồng ý tiếp tục: ${waiting.map(who).join("; ")}.`;
  }
  if (!handover) return "Chờ một trong hai bên đề xuất lịch hẹn bàn giao.";
  if (handover.change_requested) return "Lịch cũ cần thay đổi. Chờ một trong hai bên gửi đề xuất mới.";
  if (!handover.accepted_at) return `Chờ chấp thuận lịch hẹn: ${who(handover.proposed_by === claim.claimant_id ? claim.items.reporter_id : claim.claimant_id)}.`;
  const { holderId, ownerId, lost } = participants(claim);
  const delivered = lost ? handover.claimant_confirmed_at : handover.reporter_confirmed_at;
  const received = lost ? handover.reporter_confirmed_at : handover.claimant_confirmed_at;
  return [!delivered && `Chờ xác nhận đã giao: ${who(holderId)}.`, !received && `Chờ xác nhận đã nhận: ${who(ownerId)}.`].filter(Boolean).join(" ") || "Hai bên đã xác nhận trao trả.";
}
