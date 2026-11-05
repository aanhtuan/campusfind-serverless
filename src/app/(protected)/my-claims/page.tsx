import Link from "next/link";
import {
  ArrowRight,
  Clock,
  HeartHandshake,
  Search,
  Sparkles
} from "lucide-react";
import { requireUser } from "@/features/auth/server";
import { CampusHeader } from "@/components/layout/campus-header";
import { CampusFooter } from "@/components/layout/campus-footer";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser("/my-claims");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <CampusHeader authenticated={true} userEmail={user.email} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Heading */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <HeartHandshake className="size-3.5" />
            <span>Quyền sở hữu &amp; Nhận lại đồ</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Yêu cầu nhận lại đồ của bạn
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Theo dõi tiến trình xác minh và các quy định nhận lại đồ dùng bị thất lạc trong khuôn viên trường.
          </p>
        </div>

        {/* Current Capability Notice Card */}
        <div className="rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-accent/5 to-card p-6 shadow-[4px_4px_0px_0px_rgba(79,70,229,0.12)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-2xs">
              <Sparkles className="size-6 text-amber-300" />
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
                <Clock className="size-3 text-primary" />
                <span>Tính năng Claim trực tuyến đang hoàn thiện</span>
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Quy trình xác nhận quyền sở hữu trực tiếp tại trường
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Để đảm bảo tính xác thực cao nhất và tránh gian lận, việc đối chiếu bằng chứng sở hữu hiện được thực hiện trực tiếp giữa người mất và người nhặt đồ tại các điểm tiếp nhận chính thức trong trường.
              </p>
            </div>
          </div>

          {/* Verification Steps Guide */}
          <div className="mt-8 border-t border-border/80 pt-6">
            <h3 className="text-xs font-bold tracking-wider text-foreground uppercase">
              3 bước nhận lại đồ nhanh chóng và an toàn
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
                  1
                </div>
                <h4 className="mt-3 text-sm font-bold text-foreground">Tìm tin báo trên bảng tin</h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Tra cứu món đồ trong danh sách công khai và lưu lại mã số cùng địa điểm được báo nhặt.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
                  2
                </div>
                <h4 className="mt-3 text-sm font-bold text-foreground">Chuẩn bị bằng chứng riêng biệt</h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Chuẩn bị đặc điểm nhận dạng mà chỉ bạn biết (vết trầy, hình nền điện thoại, chìa khóa dự phòng...).
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
                  3
                </div>
                <h4 className="mt-3 text-sm font-bold text-foreground">Hẹn gặp tại điểm an toàn</h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Ưu tiên gặp tại Phòng Bảo vệ, Văn phòng Đoàn trường hoặc Bàn trực Thư viện để bàn giao.
                </p>
              </div>
            </div>
          </div>

          {/* Direct CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border/80 pt-6">
            <Button asChild size="default">
              <Link href="/items" className="gap-2">
                <Search className="size-4" />
                <span>Duyệt tìm đồ trên bảng tin</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="default">
              <Link href="/items/new" className="gap-2">
                <span>Báo mất món đồ của bạn</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="default">
              <Link href="/dashboard">Về Dashboard</Link>
            </Button>
          </div>
        </div>
      </main>

      <CampusFooter />
    </div>
  );
}
