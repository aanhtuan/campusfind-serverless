import type { ClaimWithItem } from "./types";
export const claimStatusLabels = { PENDING: "Chờ xét duyệt", APPROVED: "Đã chấp thuận", REJECTED: "Đã từ chối", CANCELLED: "Đã hủy" } as const;
export const meetingPointLabels: Record<string, string> = { "Campus security office": "Phòng Bảo vệ", "Student affairs office": "Phòng Công tác sinh viên", "University reception": "Quầy tiếp nhận của trường" };
export const issueLabels: Record<string, string> = { MISSED_MEETING: "Lỡ lịch hẹn", RETURN_DISPUTED: "Có tranh chấp bàn giao", SAFETY_CONCERN: "Lo ngại về an toàn" };
export const issueStatusLabels = { OPEN: "Đang mở", ACKNOWLEDGED: "Đã tiếp nhận", RESOLVED: "Đã xử lý" } as const;

export function workflowStatusLabel(claim: ClaimWithItem) {
  if (claim.status === "APPROVED" && ["RESOLVED", "CLOSED"].includes(claim.items.status)) return "Đã hoàn tất trao trả";
  if (claim.items.type === "LOST" && claim.status === "APPROVED") {
    return claim.ownership_verified_at ? "Đã xác minh chủ đồ" : "Đã chọn · Chờ xác minh chủ đồ";
  }
  return claimStatusLabels[claim.status];
}
