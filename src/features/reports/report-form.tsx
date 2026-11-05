"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Loader2,
  ShieldAlert,
  Sparkles,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { categories, createReportSchema, editReportSchema } from "./validation";
import { createReport, updateReport } from "./services";
import type { ItemReport } from "./types";

const subscribe = () => () => {};

export function ReportForm({ report }: { report?: ItemReport }) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || savedId) return;
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(
      ["title", "description", "category", "location", "event_date"].map((key) => [
        key,
        form.get(key),
      ])
    );
    const parsed = report
      ? editReportSchema.safeParse(values)
      : createReportSchema.safeParse({ ...values, type: form.get("type") });

    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])
        )
      );
      setMessage("Vui lòng kiểm tra và sửa các trường được đánh dấu bên dưới.");
      return;
    }

    inFlight.current = true;
    setBusy(true);
    setErrors({});
    setMessage("");

    try {
      const client = createClient();
      if (report) {
        await updateReport(client, report.id, parsed.data);
        setSavedId(report.id);
        setMessage("Đã lưu các thay đổi thành công!");
        router.refresh();
      } else {
        const id = await createReport(client, parsed.data);
        setSavedId(id);
        setMessage("Đã tạo tin báo thành công! Bây giờ bạn có thể đính kèm tối đa 3 ảnh minh họa.");
      }
    } catch {
      setMessage(
        report
          ? "Không thể xác nhận cập nhật. Vui lòng tải lại trang trước khi thử lại."
          : "Không thể xác nhận lưu tin báo. Hãy kiểm tra 'Báo cáo của tôi' trước khi gửi lại để tránh bị trùng lặp."
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function error(name: string) {
    return errors[name] ? (
      <p id={`${name}-error`} className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-destructive">
        <AlertCircle className="size-3.5 shrink-0" />
        <span>{errors[name]}</span>
      </p>
    ) : null;
  }

  function aria(name: string) {
    return {
      "aria-invalid": Boolean(errors[name]),
      "aria-describedby": errors[name] ? `${name}-error` : undefined,
    };
  }

  return (
    <form
      method="post"
      onSubmit={submit}
      noValidate
      className="rounded-3xl border-2 border-border/80 bg-card p-6 shadow-[4px_4px_0px_0px_rgba(17,24,39,0.06)] sm:p-10"
    >
      {/* Privacy Notice Alert */}
      <div className="mb-8 flex items-start gap-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 sm:p-5 text-amber-950">
        <ShieldAlert className="size-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed space-y-1">
          <p className="font-bold text-amber-900 text-sm">
            Nguyên tắc bảo mật thông tin học đường
          </p>
          <p>
            Tin báo sẽ được hiển thị công khai trên bảng tin chung của trường. Tuyệt đối{" "}
            <strong>không nhập mật khẩu, số căn cước, mã thẻ ngân hàng</strong> hoặc các bằng chứng sở hữu bí mật vào phần mô tả.
          </p>
          <p className="text-amber-800/90 pt-0.5">
            {report
              ? "Loại tin báo (Mất/Nhặt) và quyền sở hữu không thể thay đổi sau khi tạo."
              : "Hãy lưu thông tin cơ bản trước, sau đó bạn có thể tải lên tối đa 3 ảnh minh họa."}
          </p>
        </div>
      </div>

      <fieldset
        disabled={!hydrated || busy || Boolean(savedId)}
        className="min-w-0 space-y-8 disabled:opacity-75"
      >
        {/* Section 1: Classification */}
        <div className="space-y-4 border-b border-border/60 pb-6">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Tag className="size-4 text-primary" />
            <span>1. Phân loại tin báo</span>
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            {report ? (
              <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Loại tin</span>
                <p className="mt-1 font-bold text-foreground">
                  {report.type === "LOST" ? "Đồ tôi bị mất (Cần tìm)" : "Đồ tôi nhặt được (Chờ nhận)"}
                </p>
              </div>
            ) : (
              <div>
                <label htmlFor="type" className="mb-2 block text-sm font-semibold text-foreground">
                  Tôi muốn đăng tin <span className="text-destructive">*</span>
                </label>
                <select
                  id="type"
                  name="type"
                  defaultValue="LOST"
                  className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-base text-foreground shadow-2xs outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                  {...aria("type")}
                >
                  <option value="LOST">Tôi bị thất lạc đồ (Báo mất)</option>
                  <option value="FOUND">Tôi nhặt được đồ của người khác (Báo nhặt)</option>
                </select>
                {error("type")}
              </div>
            )}

            <div>
              <label htmlFor="category" className="mb-2 block text-sm font-semibold text-foreground">
                Danh mục món đồ <span className="text-destructive">*</span>
              </label>
              <Input
                id="category"
                name="category"
                list="report-categories"
                required
                maxLength={80}
                defaultValue={report?.category}
                placeholder="Chọn hoặc nhập danh mục"
                {...aria("category")}
              />
              <datalist id="report-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              {error("category")}
            </div>
          </div>
        </div>

        {/* Section 2: Details */}
        <div className="space-y-5 border-b border-border/60 pb-6">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <span>2. Chi tiết món đồ</span>
          </h2>

          <div>
            <label htmlFor="title" className="mb-2 block text-sm font-semibold text-foreground">
              Tiêu đề tin báo <span className="text-destructive">*</span>
            </label>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              defaultValue={report?.title}
              placeholder="Ví dụ: Ba lô đen nhãn Herschel bỏ quên tại Thư viện tầng 2"
              {...aria("title")}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Tiêu đề ngắn gọn, nêu rõ tên món đồ, màu sắc và khu vực cơ bản.
            </p>
            {error("title")}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="location" className="mb-2 block text-sm font-semibold text-foreground">
                Địa điểm trong trường <span className="text-destructive">*</span>
              </label>
              <Input
                id="location"
                name="location"
                required
                maxLength={200}
                defaultValue={report?.location}
                placeholder="Ví dụ: Giảng đường B2, phòng 204"
                {...aria("location")}
              />
              {error("location")}
            </div>

            <div>
              <label htmlFor="event_date" className="mb-2 block text-sm font-semibold text-foreground">
                {report?.type === "FOUND" ? "Ngày nhặt được" : "Ngày bị thất lạc hoặc nhặt được"}{" "}
                <span className="text-destructive">*</span>
              </label>
              <Input
                id="event_date"
                type="date"
                name="event_date"
                required
                defaultValue={report?.event_date}
                {...aria("event_date")}
              />
              {error("event_date")}
            </div>
          </div>

          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-semibold text-foreground">
              Mô tả chi tiết <span className="text-xs font-normal text-muted-foreground">(tùy chọn)</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              maxLength={5000}
              defaultValue={report?.description ?? ""}
              placeholder="Mô tả các đặc điểm bên ngoài dễ nhận diện (hình dáng, nhãn hiệu, móc khóa...). Không ghi thông tin nhận diện bí mật."
              className="min-h-24 w-full rounded-xl border border-border bg-card p-3.5 text-base text-foreground placeholder:text-muted-foreground/70 shadow-2xs outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 resize-y"
              {...aria("description")}
            />
            {error("description")}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto min-w-[200px] justify-center gap-2 rounded-xl"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Đang lưu thông tin…</span>
              </>
            ) : report ? (
              "Lưu thay đổi"
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>Đăng tin báo ngay</span>
              </>
            )}
          </Button>
        </div>
      </fieldset>

      {!hydrated && (
        <p className="mt-4 text-xs text-muted-foreground">
          Trình duyệt cần bật JavaScript để bảo đảm tính toàn vẹn phiên gửi.
        </p>
      )}

      {/* Status/Error alert message */}
      {message && (
        <div
          role={savedId ? "status" : "alert"}
          aria-live="polite"
          className={`mt-6 flex items-start gap-2.5 rounded-2xl p-4 text-sm ${
            savedId
              ? "border border-emerald-200 bg-emerald-50 text-emerald-950 font-medium"
              : "border border-destructive/20 bg-destructive/10 text-destructive font-medium"
          }`}
        >
          {savedId ? (
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-destructive mt-0.5" />
          )}
          <span className="leading-relaxed">{message}</span>
        </div>
      )}

      {/* Next Step Action Card */}
      {savedId && (
        <div className="mt-6 rounded-2xl border border-primary/20 bg-secondary/50 p-5">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <ImageIcon className="size-4 text-primary" />
            <span>Bước tiếp theo: Đính kèm hình ảnh</span>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Thêm ảnh chụp giúp mọi người nhận diện đồ vật nhanh hơn và tăng cơ hội tìm lại thành công.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild size="default">
              <Link href={`/my-reports/${savedId}`} className="gap-2">
                <span>{report ? "Xem báo cáo vừa cập nhật" : "Thêm ảnh & Quản lý báo cáo"}</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="default">
              <Link href="/my-reports">Về danh sách của tôi</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Back link */}
      <div className="mt-6 border-t border-border/60 pt-4">
        <Link
          href="/my-reports"
          className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
        >
          ← Quay lại danh sách báo cáo của tôi
        </Link>
      </div>
    </form>
  );
}
