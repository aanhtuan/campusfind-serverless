"use client";

import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Handshake,
  Loader2,
  MapPin,
  RefreshCw,
  Share2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { campusLocations, issueCategories } from "./services";
import { meetingPointLabels, issueLabels, issueStatusLabels } from "./labels";
import { useWorkflow, WorkflowButton } from "./controls";
import { actorText } from "@/features/identity/actors";
import { participants } from "./participants";
import type { ClaimWithItem, Contact, Handover, WorkflowIssue } from "./types";

const selectClass =
  "min-h-11 w-full rounded-xl border-2 border-border/80 bg-card px-3.5 text-sm font-semibold text-foreground shadow-2xs outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40";

function formatLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function Coordination({
  claim,
  userId,
  handover,
  contacts,
  issues,
}: {
  claim: ClaimWithItem;
  userId: string;
  handover: Handover | null;
  contacts: Contact[];
  issues: WorkflowIssue[];
}) {
  const proposeOp = useWorkflow();
  const contactOp = useWorkflow();
  const issueOp = useWorkflow();

  const [location, setLocation] = useState<string>(campusLocations[0]);
  const [time, setTime] = useState("");
  const [kind, setKind] = useState("EMAIL");
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [category, setCategory] = useState<string>(issueCategories[0]);
  const [proposalError, setProposalError] = useState("");
  const [proposalSuccess, setProposalSuccess] = useState("");

  const [minDateTime] = useState(() =>
    formatLocalInput(new Date(Date.now() + 5 * 60 * 1000))
  );
  const [maxDateTime] = useState(() =>
    formatLocalInput(new Date(Date.now() + 90 * 86400000))
  );

  const openIssue = issues.find((issue) => issue.status !== "RESOLVED");
  const { holderId, lost } = participants(claim);
  const who = (id: string) => actorText(id, claim.actors, userId);
  const isHolder = userId === holderId;
  const isReporter = userId === claim.items.reporter_id;
  const myConfirmation = isReporter
    ? handover?.reporter_confirmed_at
    : handover?.claimant_confirmed_at;
  const anyConfirmation =
    handover?.reporter_confirmed_at || handover?.claimant_confirmed_at;
  const active = claim.items.status === "IN_PROGRESS";
  const revision = handover?.revision ?? 0;
  const fields = { claim_id: claim.id, revision };

  function propose(event: FormEvent) {
    event.preventDefault();
    setProposalError("");
    setProposalSuccess("");

    const form = new FormData(event.currentTarget as HTMLFormElement);
    const timeValue = String(form.get("meeting_at") || time || "");
    const locationValue = String(form.get("location") || location || campusLocations[0]);

    if (!timeValue) {
      setProposalError("Vui lòng chọn ngày và giờ hẹn.");
      return;
    }

    const date = new Date(timeValue);
    if (!Number.isFinite(date.getTime())) {
      setProposalError("Vui lòng chọn ngày và giờ hẹn hợp lệ.");
      return;
    }

    const now = Date.now();
    if (date.getTime() <= now) {
      setProposalError("Vui lòng chọn thời gian hẹn ở tương lai (sau thời điểm hiện tại).");
      return;
    }

    if (date.getTime() > now + 90 * 86400000) {
      setProposalError("Thời gian hẹn không được vượt quá 90 ngày kể từ hiện tại.");
      return;
    }

    void proposeOp.run(
      {
        action: "propose_handover",
        data: {
          ...fields,
          location: locationValue,
          meeting_at: date.toISOString(),
        },
      },
      () => {
        setTime("");
        setProposalSuccess("Đã gửi đề xuất lịch bàn giao thành công! Vui lòng chờ đối phương phản hồi.");
      }
    );
  }

  return (
    <section className="mt-8 space-y-8">
      {/* 1. Handover Coordination Card */}
      <div className="rounded-3xl border-2 border-border/80 bg-card p-6 shadow-[4px_4px_0px_0px_rgba(17,24,39,0.06)] sm:p-8">
        <div className="border-b border-border/60 pb-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary mb-2">
            <Handshake className="size-3.5" />
            <span>Bước 3 · Thống nhất bàn giao</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Thống nhất bàn giao
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Ưu tiên điểm hẹn công khai trong trường. Không bắt buộc chia sẻ thông tin liên hệ. Mỗi đề xuất cần được bên còn lại chấp thuận.
          </p>
        </div>

        {handover ? (
          <div className="mt-6 rounded-2xl border-2 border-border/70 bg-secondary/30 p-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-primary shrink-0" />
                <span className="font-bold text-foreground sm:text-base">
                  {meetingPointLabels[handover.location] ?? handover.location}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-0.5 text-xs font-semibold text-foreground border border-border/80">
                <RefreshCw className="size-3 text-muted-foreground" />
                <span>Phiên bản {revision}</span>
              </span>
            </div>

            <div className="grid gap-2.5 text-xs sm:text-sm text-foreground/90">
              <p className="flex items-center gap-2">
                <Clock className="size-4 text-amber-600 shrink-0" />
                <time dateTime={handover.meeting_at} className="font-semibold text-foreground">
                  {new Date(handover.meeting_at).toLocaleString("en-GB", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}{" "}
                  (giờ Việt Nam)
                </time>
              </p>
              <p className="flex items-center gap-2">
                <User className="size-4 text-primary shrink-0" />
                <span>
                  <strong>Người đề xuất:</strong> {who(handover.proposed_by)}
                </span>
              </p>
              <p className="text-muted-foreground">
                {handover.change_requested
                  ? "Cần gửi đề xuất lịch hẹn mới"
                  : handover.accepted_by
                  ? `Người chấp thuận: ${who(handover.accepted_by)}`
                  : `Chờ chấp thuận: ${who(
                      handover.proposed_by === claim.claimant_id
                        ? claim.items.reporter_id
                        : claim.claimant_id
                    )}`}
              </p>
              <p className="font-medium text-foreground">
                Trạng thái:{" "}
                <span className="font-bold text-primary">
                  {handover.change_requested
                    ? "Đã yêu cầu thay đổi — cần gửi đề xuất mới"
                    : handover.accepted_at
                    ? "Hai bên đã thống nhất"
                    : "Đang chờ bên còn lại chấp thuận"}
                </span>
              </p>
              <div className="rounded-xl border border-border/80 bg-card p-3 text-xs leading-relaxed space-y-1">
                <p>
                  <strong>Người giao ({who(holderId)}):</strong>{" "}
                  {(lost
                    ? handover.claimant_confirmed_at
                    : handover.reporter_confirmed_at)
                    ? "Đã giao đồ"
                    : "Chưa xác nhận"}
                </p>
                <p>
                  <strong>
                    Người nhận (
                    {who(lost ? claim.items.reporter_id : claim.claimant_id)}):
                  </strong>{" "}
                  {(lost
                    ? handover.reporter_confirmed_at
                    : handover.claimant_confirmed_at)
                    ? "Đã nhận đồ"
                    : "Chưa xác nhận"}
                </p>
              </div>
            </div>

            {active && !openIssue && (
              <div className="flex flex-wrap gap-3 pt-3 border-t border-border/60">
                {!handover.accepted_at &&
                  !handover.change_requested &&
                  handover.proposed_by !== userId && (
                    <WorkflowButton
                      variant="default"
                      request={{ action: "accept_handover", data: fields }}
                    >
                      Chấp thuận lịch hẹn
                    </WorkflowButton>
                  )}
                {!anyConfirmation && (
                  <WorkflowButton
                    variant="outline"
                    request={{ action: "request_change", data: fields }}
                  >
                    Yêu cầu đổi lịch
                  </WorkflowButton>
                )}
                {handover.accepted_at && !myConfirmation && (
                  <WorkflowButton
                    variant="default"
                    request={{ action: "confirm_return", data: fields }}
                  >
                    {isHolder ? "Xác nhận đã giao đồ" : "Xác nhận đã nhận đồ"}
                  </WorkflowButton>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border-2 border-dashed border-border/80 p-6 text-center text-xs sm:text-sm text-muted-foreground">
            Chưa có đề xuất bàn giao nào. Hãy tạo đề xuất địa điểm và thời gian gặp mặt bên dưới.
          </div>
        )}

        {/* Propose Form */}
        {active && !openIssue && !anyConfirmation && !handover?.accepted_at && (
          <form
            method="post"
            onSubmit={propose}
            className="mt-6 space-y-4 rounded-2xl border-2 border-border/80 bg-secondary/20 p-5"
          >
            <h3 className="text-sm font-bold text-foreground">
              {handover ? "Đề xuất lịch hẹn mới" : "Tạo đề xuất lịch hẹn bàn giao"}
            </h3>
            <div>
              <label
                htmlFor="handover-location"
                className="mb-2 block text-xs sm:text-sm font-bold text-foreground"
              >
                Điểm hẹn công khai trong trường
              </label>
              <select
                id="handover-location"
                name="location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                disabled={proposeOp.disabled}
                className={selectClass}
              >
                {campusLocations.map((value) => (
                  <option key={value} value={value}>
                    {meetingPointLabels[value] ?? value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="handover-time"
                className="mb-2 block text-xs sm:text-sm font-bold text-foreground"
              >
                Ngày, giờ hẹn (theo giờ trên thiết bị của bạn)
              </label>
              <Input
                id="handover-time"
                name="meeting_at"
                type="datetime-local"
                required
                min={minDateTime}
                max={maxDateTime}
                value={time}
                onChange={(event) => {
                  setTime(event.target.value);
                  if (proposalError) setProposalError("");
                }}
                disabled={proposeOp.disabled}
              />
            </div>

            <Button type="submit" disabled={proposeOp.disabled}>
              {proposeOp.busy && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Đề xuất lịch bàn giao
            </Button>

            {proposalError && (
              <p
                role="alert"
                className="text-xs font-semibold text-destructive mt-1.5"
              >
                {proposalError}
              </p>
            )}

            {proposalSuccess && (
              <p
                role="status"
                className="mt-2 flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-950"
              >
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>{proposalSuccess}</span>
              </p>
            )}

            {proposeOp.message && (
              <p
                role="status"
                className="mt-2 flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs font-semibold text-primary"
              >
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>{proposeOp.message}</span>
              </p>
            )}
          </form>
        )}

        {myConfirmation && active && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-medium text-emerald-950">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>
              Đã ghi nhận xác nhận của bạn. Chờ xác nhận của{" "}
              {who(isReporter ? claim.claimant_id : claim.items.reporter_id)}. Nếu
              có vấn đề, hãy báo sự cố ở phần bên dưới.
            </span>
          </div>
        )}
      </div>

      {/* 2. Contact Sharing Card */}
      <div className="rounded-3xl border-2 border-border/80 bg-card p-6 shadow-[4px_4px_0px_0px_rgba(17,24,39,0.06)] sm:p-8">
        <div className="border-b border-border/60 pb-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary mb-2">
            <Share2 className="size-3.5" />
            <span>Bảo mật liên hệ</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Chia sẻ liên hệ (tùy chọn)
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Email tài khoản không được chia sẻ tự động. Chỉ hai bên trong yêu cầu đã được chấp thuận mới xem được liên hệ bạn đồng ý cung cấp. Bạn có thể thu hồi bất cứ lúc nào; người đã xem vẫn có thể lưu thông tin trước đó.
          </p>
        </div>

        {contacts.length > 0 && (
          <ul className="mt-5 space-y-3">
            {contacts.map((value) => (
              <li
                key={value.user_id}
                className="rounded-2xl border-2 border-border/70 bg-secondary/30 p-4 text-xs sm:text-sm [overflow-wrap:anywhere]"
              >
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <User className="size-4 text-primary" />
                  <span>{who(value.user_id)}:</span>
                  <span className="rounded-lg bg-card px-2 py-0.5 border border-border/80 font-mono text-xs">
                    {value.kind}
                  </span>
                  <span className="font-semibold text-primary">{value.value}</span>
                </div>
                {value.user_id === userId && (
                  <div className="mt-3">
                    <WorkflowButton
                      variant="outline"
                      request={{
                        action: "revoke_contact",
                        data: { claim_id: claim.id },
                      }}
                    >
                      Thu hồi liên hệ đã chia sẻ
                    </WorkflowButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <form
          method="post"
          className="mt-6 space-y-4 rounded-2xl border-2 border-border/80 bg-secondary/20 p-5"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void contactOp.run(
              {
                action: "share_contact",
                data: { claim_id: claim.id, kind, value: contact, consent },
              },
              () => {
                setContact("");
                setConsent(false);
              }
            );
          }}
        >
          <div>
            <label
              htmlFor="contact-kind"
              className="mb-2 block text-xs sm:text-sm font-bold text-foreground"
            >
              Loại liên hệ
            </label>
            <select
              id="contact-kind"
              className={selectClass}
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              disabled={contactOp.disabled}
            >
              <option value="EMAIL">Email</option>
              <option value="PHONE">Điện thoại</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="contact-value"
              className="mb-2 block text-xs sm:text-sm font-bold text-foreground"
            >
              Liên hệ bạn muốn chia sẻ
            </label>
            <Input
              id="contact-value"
              type={kind === "EMAIL" ? "email" : "tel"}
              required
              maxLength={254}
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              disabled={contactOp.disabled}
              autoComplete="off"
              placeholder={
                kind === "EMAIL"
                  ? "example@campus.edu.vn"
                  : "0901234567"
              }
            />
          </div>

          <label className="flex items-start gap-3 text-xs sm:text-sm text-muted-foreground select-none cursor-pointer">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              disabled={contactOp.disabled}
              className="mt-0.5 size-4 rounded accent-primary"
            />
            <span>
              Tôi đồng ý chia sẻ liên hệ này với bên còn lại để phối hợp bàn giao trong yêu cầu đã được chấp thuận.
            </span>
          </label>

          <Button
            disabled={contactOp.disabled || !consent}
            type="submit"
            variant="outline"
          >
            {contactOp.busy && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Đồng ý chia sẻ liên hệ
          </Button>

          {contactOp.message && (
            <p
              role="status"
              className="mt-2 flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs font-semibold text-primary"
            >
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>{contactOp.message}</span>
            </p>
          )}
        </form>
      </div>

      {/* 3. Handover Issues Card */}
      <div className="rounded-3xl border-2 border-border/80 bg-card p-6 shadow-[4px_4px_0px_0px_rgba(17,24,39,0.06)] sm:p-8">
        <div className="border-b border-border/60 pb-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-800 mb-2">
            <AlertTriangle className="size-3.5 text-rose-600" />
            <span>Hỗ trợ sự cố</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Sự cố bàn giao
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Sự cố chưa xử lý sẽ tạm dừng thay đổi lịch và xác nhận hoàn tất. Quản trị viên có thể ghi nhận loại sự cố. Cần cả hai bên đồng ý để tiếp tục; kết quả duyệt và các xác nhận đã gửi vẫn được giữ nguyên.
          </p>
        </div>

        {issues.map((issue) => (
          <div
            key={issue.id}
            className="mt-5 rounded-2xl border-2 border-rose-200 bg-rose-50/60 p-5 text-xs sm:text-sm text-rose-950 space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-rose-900">
                {issueLabels[issue.category] ?? issue.category}
              </span>
              <span className="rounded-full bg-white px-2.5 py-0.5 font-bold text-xs border border-rose-300">
                {issueStatusLabels[issue.status]}
              </span>
            </div>
            <p className="text-rose-900/90">
              {who(claim.items.reporter_id)} đồng ý tiếp tục:{" "}
              {issue.reporter_resumed_at ? "Có" : "Chưa"} ·{" "}
              {who(claim.claimant_id)}:{" "}
              {issue.claimant_resumed_at ? "Có" : "Chưa"}
            </p>
            {active &&
              issue.status !== "RESOLVED" &&
              !(isReporter
                ? issue.reporter_resumed_at
                : issue.claimant_resumed_at) && (
                <div className="mt-3 pt-2">
                  <WorkflowButton
                    variant="outline"
                    request={{
                      action: "resume_issue",
                      data: { claim_id: claim.id, issue_id: issue.id },
                    }}
                  >
                    Đồng ý tiếp tục bàn giao
                  </WorkflowButton>
                </div>
              )}
          </div>
        ))}

        {active && !openIssue && (
          <form
            method="post"
            className="mt-6 space-y-4 rounded-2xl border-2 border-border/80 bg-secondary/20 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void issueOp.run({
                action: "open_issue",
                data: { claim_id: claim.id, category },
              });
            }}
          >
            <div>
              <label
                htmlFor="issue-category"
                className="mb-2 block text-xs sm:text-sm font-bold text-foreground"
              >
                Loại sự cố
              </label>
              <select
                id="issue-category"
                className={selectClass}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                disabled={issueOp.disabled}
              >
                {issueCategories.map((value) => (
                  <option key={value} value={value}>
                    {issueLabels[value] ?? value}
                  </option>
                ))}
              </select>
            </div>
            <Button
              disabled={issueOp.disabled}
              type="submit"
              variant="outline"
              className="text-rose-700 hover:bg-rose-50 hover:border-rose-300"
            >
              {issueOp.busy && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Báo sự cố bàn giao
            </Button>

            {issueOp.message && (
              <p
                role="status"
                className="mt-3 flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs font-semibold text-primary"
              >
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>{issueOp.message}</span>
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
