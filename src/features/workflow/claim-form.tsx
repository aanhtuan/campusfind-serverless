"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Edit3,
  Loader2,
  Lock,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkflow } from "./controls";

export function ClaimForm({
  itemId,
  lost = false,
}: {
  itemId: string;
  lost?: boolean;
}) {
  const operation = useWorkflow();
  const requestId = useRef<string | null>(null);
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
          {lost ? (
            <Sparkles className="size-3.5" />
          ) : (
            <Lock className="size-3.5" />
          )}
          <span>{lost ? "Phản hồi nhặt được đồ" : "Yêu cầu nhận lại đồ"}</span>
        </div>
        <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          {lost ? "Phản hồi nhặt được đồ" : "Gửi yêu cầu nhận đồ"}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {lost
            ? "Mô tả món đồ bạn đang giữ và nơi, thời điểm nhặt được. Chỉ bạn và người báo mất xem được phản hồi. Giữ lại một số đặc điểm riêng để đối chiếu bằng chứng của chủ đồ trước khi trao. Không gửi mật khẩu, số giấy tờ hoặc thông tin liên hệ. Phản hồi không thể sửa sau khi gửi."
            : "Mô tả đặc điểm riêng để chứng minh món đồ thuộc về bạn. Chỉ bạn và người đăng được xem bằng chứng. Không gửi mật khẩu, số giấy tờ định danh hoặc thông tin liên hệ không cần thiết. Bằng chứng không thể sửa sau khi gửi."}
        </p>
      </div>

      {/* Security alert box */}
      <div className="mt-6 flex items-start gap-3 rounded-2xl border-2 border-amber-300/80 bg-amber-50/70 p-4 text-xs text-amber-950 sm:text-sm">
        <ShieldAlert className="size-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-900">Nguyên tắc an toàn học đường</p>
          <p className="text-xs leading-relaxed text-amber-800">
            Nội dung trao đổi sẽ được mã hóa bảo mật và chỉ người đăng tin mới có quyền xem để xét duyệt. Tuyệt đối không gửi thông tin tài khoản ngân hàng, mã OTP hoặc giấy tờ tùy thân.
          </p>
        </div>
      </div>

      {preview ? (
        <div className="mt-6 space-y-4 rounded-2xl border-2 border-border/80 bg-secondary/30 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
            <h3 className="font-bold text-sm text-foreground">
              {lost
                ? "Kiểm tra phản hồi trước khi gửi"
                : "Kiểm tra bằng chứng trước khi gửi"}
            </h3>
            <span className="text-xs font-semibold text-primary">Xem trước</span>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">
              {proof.trim()}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              disabled={operation.disabled}
              onClick={() => {
                requestId.current ??= crypto.randomUUID();
                void operation.run(
                  {
                    action: lost ? "submit_found_response" : "submit_claim",
                    data: {
                      item_id: itemId,
                      proof_text: proof.trim(),
                      request_id: requestId.current,
                    },
                  },
                  (id) => operation.router.replace(`/claims/${id}`)
                );
              }}
              className="gap-2"
            >
              {operation.busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              <span>
                {lost ? "Gửi phản hồi nhặt được đồ" : "Gửi yêu cầu xác minh"}
              </span>
            </Button>
            <Button
              variant="outline"
              disabled={operation.disabled}
              onClick={() => {
                setPreview(false);
                requestId.current = null;
              }}
              className="gap-2"
            >
              <Edit3 className="size-4" />
              <span>{lost ? "Sửa phản hồi" : "Sửa bằng chứng"}</span>
            </Button>
          </div>
        </div>
      ) : (
        <form method="post" onSubmit={review} className="mt-6 space-y-4">
          <div>
            <label
              className="mb-2 block text-xs sm:text-sm font-bold text-foreground"
              htmlFor="claim-proof"
            >
              {lost
                ? "Mô tả đồ đã nhặt được (20–5000 ký tự)"
                : "Bằng chứng sở hữu (20–5000 ký tự)"}
            </label>
            <textarea
              id="claim-proof"
              required
              minLength={20}
              maxLength={5000}
              value={proof}
              onChange={(event) => setProof(event.target.value)}
              disabled={operation.disabled}
              rows={7}
              placeholder={
                lost
                  ? "Ví dụ: Mình nhặt được chiếc ví da này ở hàng ghế dãy B thư viện vào chiều thứ Ba, bên trong có thẻ sinh viên và thẻ thư viện..."
                  : "Ví dụ: Đây là chìa khóa xe máy Honda của mình, có gắn móc khóa hình phi hành gia màu xanh dương và một thẻ gửi xe ký túc xá..."
              }
              className="w-full rounded-2xl border-2 border-border/80 bg-background p-4 text-sm text-foreground leading-relaxed outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
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
            {lost ? "Xem lại phản hồi" : "Xem lại bằng chứng"}
          </Button>
        </form>
      )}

      {operation.message && (
        <p
          role="status"
          className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary"
        >
          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
          <span>{operation.message}</span>
        </p>
      )}
    </section>
  );
}
