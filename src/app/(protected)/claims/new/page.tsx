import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Info } from "lucide-react";
import { requireUser } from "@/features/auth/server";
import { createClient } from "@/lib/supabase/server";
import { reportId } from "@/features/reports/validation";
import { ReportShell } from "@/features/reports/report-ui";
import { ClaimForm } from "@/features/workflow/claim-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ item?: string }>;
}) {
  const { item: id } = await searchParams;
  const user = await requireUser(`/claims/new?item=${encodeURIComponent(id ?? "")}`);
  if (!reportId.safeParse(id).success) notFound();
  const client = await createClient();
  const { data: item, error } = await client
    .from("items")
    .select("id,title,type,status,reporter_id")
    .eq("id", id!)
    .maybeSingle();

  if (error) throw new Error("Item could not be loaded.");
  if (!item) notFound();

  const { data: existing, error: claimsError } = await client
    .from("claims")
    .select("id")
    .eq("item_id", id!)
    .eq("claimant_id", user.id)
    .in("status", ["PENDING", "APPROVED"])
    .maybeSingle();

  if (claimsError) throw new Error("Claims could not be loaded.");
  const eligible = item.status === "OPEN" && item.reporter_id !== user.id;

  return (
    <ReportShell
      title={item.title}
      subtitle={
        item.type === "LOST"
          ? "Phản hồi nhặt được đồ cho người báo mất"
          : "Yêu cầu xác minh quyền sở hữu riêng tư"
      }
    >
      {/* Breadcrumb Back */}
      <div className="mb-6">
        <Link
          href={`/items/${id}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-secondary/70 sm:text-sm"
        >
          <ArrowLeft className="size-4" />
          <span>Quay lại xem tin báo</span>
        </Link>
      </div>

      {existing ? (
        <div className="rounded-3xl border-2 border-border/80 bg-card p-6 shadow-[4px_4px_0px_0px_rgba(17,24,39,0.06)] sm:p-8">
          <div className="flex items-start gap-3 rounded-2xl bg-secondary/50 p-5">
            <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                Bạn đã có yêu cầu hoặc phản hồi đang được xử lý
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Hệ thống ghi nhận bạn đã gửi thông tin cho tin báo này. Vui lòng theo dõi trạng thái phản hồi và kết quả bàn giao tại trang chi tiết.
              </p>
              <div className="pt-2">
                <Button asChild>
                  <Link href={`/claims/${existing.id}`} className="gap-2">
                    <span>Theo dõi yêu cầu của bạn</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : eligible ? (
        <ClaimForm itemId={item.id} lost={item.type === "LOST"} />
      ) : (
        <div className="rounded-3xl border-2 border-border/80 bg-card p-6 shadow-[4px_4px_0px_0px_rgba(17,24,39,0.06)] sm:p-8">
          <div className="flex items-start gap-3 rounded-2xl bg-muted/40 p-5">
            <Info className="size-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="text-base font-bold text-foreground">
                Không thể gửi yêu cầu hoặc phản hồi
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Tài khoản của bạn hiện không thể gửi yêu cầu hoặc phản hồi cho tin này (tin báo do chính bạn đăng hoặc trạng thái tin không còn mở nhận yêu cầu).
              </p>
              <div className="pt-2">
                <Button asChild variant="outline">
                  <Link href="/items" className="gap-2">
                    <FileText className="size-4" />
                    <span>Xem bảng tin đồ thất lạc</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ReportShell>
  );
}
