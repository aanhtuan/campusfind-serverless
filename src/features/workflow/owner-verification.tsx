"use client";

import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Clock,
  Edit3,
  Loader2,
  Lock,
  Send,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkflow, WorkflowButton } from "./controls";
import type { ClaimWithItem } from "./types";

export function OwnerVerification({
  claim,
  reporter,
}: {
  claim: ClaimWithItem;
  reporter: boolean;
}) {
  const operation = useWorkflow();
  const [proof, setProof] = useState("");
  const [preview, setPreview] = useState(false);

  function review(event: FormEvent) {
    event.preventDefault();
    if (proof.trim().length >= 20 && proof.trim().length <= 5000) {
      setPreview(true);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border-2 border-border/80 bg-card p-6 shadow-[4px_4px_0px_0px_rgba(17,24,39,0.06)] sm:p-8">
      {/* Header */}
      <div className="border-b border-border/60 pb-4">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary mb-2">
          <ShieldCheck className="size-3.5" />
          <span>Bước 2 · Xác minh quyền sở hữu</span>
        </div>
        <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          Xác minh chủ đồ trước khi bàn giao
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Phản hồi đã được chọn nhưng quyền sở hữu chưa được xác minh. Người đang giữ đồ cần đối chiếu bằng chứng riêng của người báo mất trước khi đồng ý trao lại. Không gửi mật khẩu hay số giấy tờ định danh.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        {claim.owner_proof_text ? (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5">
              <div className="flex items-center justify-between gap-2 border-b border-primary/15 pb-2.5">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Lock className="size-4 text-primary" />
                  <span>Bằng chứng riêng của người báo mất</span>
                </h3>
                <span className="text-xs font-semibold text-primary">
                  Riêng tư · Đã gửi
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">
                {claim.owner_proof_text}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Chỉ hai bên của phản hồi này được xem. Bằng chứng đã gửi không thể sửa.
            </p>

            {reporter ? (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs font-semibold text-amber-900">
                <Clock className="size-4 text-amber-600 shrink-0" />
                <span>Đang chờ người giữ đồ đối chiếu bằng chứng.</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3 pt-2">
                <WorkflowButton
                  variant="default"
                  request={{
                    action: "verify_owner",
                    data: { claim_id: claim.id, decision: "APPROVED" },
                  }}
                >
                  Bằng chứng khớp, đồng ý bàn giao
                </WorkflowButton>
                <WorkflowButton
                  variant="outline"
                  request={{
                    action: "verify_owner",
                    data: { claim_id: claim.id, decision: "REJECTED" },
                  }}
                >
                  Bằng chứng không khớp
                </WorkflowButton>
              </div>
            )}
          </div>
        ) : reporter ? (
          preview ? (
            <div className="space-y-4 rounded-2xl border-2 border-border/80 bg-secondary/30 p-5">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="size-4 text-amber-600" />
                <span>Kiểm tra bằng chứng của bạn</span>
              </h3>
              <div className="rounded-xl border border-border/80 bg-card p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">
                  {proof.trim()}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  disabled={operation.disabled}
                  onClick={() =>
                    void operation.run({
                      action: "submit_owner_proof",
                      data: {
                        claim_id: claim.id,
                        proof_text: proof.trim(),
                      },
                    })
                  }
                  className="gap-2"
                >
                  {operation.busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  <span>Gửi bằng chứng cho người giữ đồ</span>
                </Button>
                <Button
                  variant="outline"
                  disabled={operation.disabled}
                  onClick={() => setPreview(false)}
                  className="gap-2"
                >
                  <Edit3 className="size-4" />
                  <span>Sửa bằng chứng</span>
                </Button>
              </div>
            </div>
          ) : (
            <form method="post" onSubmit={review} className="space-y-4">
              <div>
                <label
                  htmlFor="owner-proof"
                  className="mb-2 block text-sm font-bold text-foreground"
                >
                  Đặc điểm riêng chứng minh quyền sở hữu (20–5000 ký tự)
                </label>
                <textarea
                  id="owner-proof"
                  required
                  minLength={20}
                  maxLength={5000}
                  value={proof}
                  onChange={(event) => setProof(event.target.value)}
                  rows={6}
                  disabled={operation.disabled}
                  placeholder="Mô tả các chi tiết nhận diện chỉ chủ sở hữu mới biết (ví dụ: vết trầy xước đặc biệt, tem dán bí mật, nội dung bên trong, hình nền khóa...)"
                  className="w-full rounded-2xl border-2 border-border/80 bg-card p-4 text-sm text-foreground leading-relaxed outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                />
                <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Tối thiểu 20 ký tự, tối đa 5000 ký tự.</span>
                  <span className={proof.trim().length >= 20 ? "text-primary font-bold" : ""}>
                    {proof.trim().length} ký tự
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={operation.disabled || proof.trim().length < 20}
              >
                Xem lại bằng chứng của tôi
              </Button>
            </form>
          )
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-secondary/60 border border-border/80 p-4 text-xs font-semibold text-foreground">
            <Clock className="size-4 text-primary shrink-0" />
            <span>Đang chờ người báo mất gửi bằng chứng sở hữu riêng tư.</span>
          </div>
        )}

        {/* Withdraw Option */}
        <div className="border-t border-border/60 pt-4">
          <WorkflowButton
            variant="outline"
            request={{ action: "withdraw_match", data: { claim_id: claim.id } }}
          >
            {reporter ? "Bỏ chọn phản hồi này" : "Không thể tiếp tục phản hồi này"}
          </WorkflowButton>
        </div>

        {operation.message && (
          <p
            role="status"
            className="flex items-center gap-1.5 text-xs font-semibold text-primary"
          >
            <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
            <span>{operation.message}</span>
          </p>
        )}
      </div>
    </section>
  );
}
