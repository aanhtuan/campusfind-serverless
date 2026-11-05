import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText, PlusCircle } from "lucide-react";
import { requireUser } from "@/features/auth/server";
import { createClient } from "@/lib/supabase/server";
import { ownReports } from "@/features/reports/services";
import { pageNumber } from "@/features/reports/validation";
import { ReportCard, ReportShell } from "@/features/reports/report-ui";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const page = pageNumber((await searchParams).page);
  const user = await requireUser(`/my-reports?page=${page}`);
  const { reports, hasNext } = await ownReports(await createClient(), user.id, page);

  return (
    <ReportShell
      title="Báo cáo của tôi"
      subtitle="Theo dõi các tin báo mất hoặc nhặt được của bạn, bao gồm cả các báo cáo đang mở và đã hoàn tất trao trả."
    >
      {reports.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-2xs">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <FileText className="size-7" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-foreground">
            {page === 1 ? "Bạn chưa có tin báo nào" : "Không có tin báo nào ở trang này"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
            {page === 1
              ? "Khi bạn đăng tin báo mất hoặc nhặt được đồ, toàn bộ lịch sử và tiến độ xử lý sẽ được lưu trữ tại đây."
              : "Hãy quay lại các trang trước để xem danh sách tin báo của bạn."}
          </p>
          {page === 1 && (
            <div className="mt-6">
              <Button asChild size="lg" className="rounded-xl">
                <Link href="/items/new" className="gap-2">
                  <PlusCircle className="size-4" />
                  <span>Tạo tin báo đầu tiên</span>
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      <nav
        aria-label="Phân trang danh sách của tôi"
        className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4"
      >
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/my-reports?page=${page - 1}`} className="gap-1.5">
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
            <Link href={`/my-reports?page=${page + 1}`} className="gap-1.5">
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
