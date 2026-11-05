import Link from "next/link";
import {
  ArrowRight,
  FileText,
  HeartHandshake,
  Mail,
  PlusCircle,
  Search,
  ShieldCheck,
  Sparkles,
  User
} from "lucide-react";
import { requireUser } from "@/features/auth/server";
import { LogoutButton } from "@/features/auth/logout-button";
import { createClient } from "@/lib/supabase/server";
import { CampusHeader } from "@/components/layout/campus-header";
import { CampusFooter } from "@/components/layout/campus-footer";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser("/dashboard");
  const client = await createClient();
  const { data: profile, error } = await client
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.display_name || "Thành viên Campus";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <CampusHeader
        authenticated={true}
        userEmail={user.email}
        displayName={profile?.display_name}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-primary bg-primary p-6 sm:p-10 text-primary-foreground shadow-[4px_4px_0px_0px_rgba(17,24,39,0.12)]">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/95 backdrop-blur-xs">
                <Sparkles className="size-3.5 text-amber-300" />
                <span>Không gian cá nhân của bạn</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Xin chào, {displayName}!
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-indigo-100">
                Cảm ơn bạn đã đồng hành cùng cộng đồng CampusFind. Dưới đây là các công cụ giúp bạn quản lý tin báo và tìm lại đồ vật.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <LogoutButton />
            </div>
          </div>
        </div>

        {/* Profile Details Card */}
        <section aria-labelledby="profile-heading" className="mt-8 rounded-3xl border-2 border-border/80 bg-card p-6 shadow-[4px_4px_0px_0px_rgba(17,24,39,0.06)] sm:p-8">
          <div className="border-b border-border/60 pb-4">
            <h2 id="profile-heading" className="text-base font-bold text-foreground flex items-center gap-2">
              <User className="size-4 text-primary" />
              <span>Thông tin tài khoản trường học</span>
            </h2>
          </div>

          {error || !profile ? (
            <p role="alert" className="mt-4 text-sm text-destructive font-medium">
              Không thể tải thông tin hồ sơ. Vui lòng tải lại trang để thử lại.
            </p>
          ) : (
            <dl className="mt-6 grid gap-6 sm:grid-cols-3">
              <div className="rounded-2xl border-2 border-border/70 bg-secondary/30 p-4 shadow-2xs">
                <dt className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <User className="size-3.5 text-primary" />
                  <span>Tên hiển thị</span>
                </dt>
                <dd className="mt-2 text-base font-bold text-foreground break-words">
                  {profile.display_name || "Chưa đặt tên"}
                </dd>
              </div>

              <div className="rounded-2xl border-2 border-border/70 bg-secondary/30 p-4 shadow-2xs">
                <dt className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Mail className="size-3.5 text-primary" />
                  <span>Email xác thực</span>
                </dt>
                <dd className="mt-2 text-base font-bold text-foreground break-all">
                  {user.email || "Email không khả dụng"}
                </dd>
              </div>

              <div className="rounded-2xl border-2 border-border/70 bg-secondary/30 p-4 shadow-2xs">
                <dt className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" />
                  <span>Vai trò tài khoản</span>
                </dt>
                <dd className="mt-2 text-base font-bold text-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary uppercase">
                    {profile.role}
                  </span>
                </dd>
              </div>
            </dl>
          )}
        </section>

        {/* Quick Action Cards */}
        <section aria-labelledby="actions-heading" className="mt-8">
          <div className="mb-4">
            <h2 id="actions-heading" className="text-lg font-bold text-foreground">
              Thao tác nhanh
            </h2>
            <p className="text-xs text-muted-foreground">
              Chọn tính năng phù hợp với nhu cầu hiện tại của bạn.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Card 1: Create Report */}
            <div className="group rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-accent/5 to-card p-6 shadow-[4px_4px_0px_0px_rgba(79,70,229,0.15)] transition-all duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-[6px_6px_0px_0px_rgba(79,70,229,0.25)]">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-2xs">
                <PlusCircle className="size-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">
                Báo mất hoặc nhặt được đồ
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Đăng tin báo mới chỉ trong 1 phút để cộng đồng trường học cùng chung tay hỗ trợ tìm kiếm hoặc chờ người nhận.
              </p>
              <div className="mt-6">
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/items/new" className="gap-2">
                    <span>Tạo tin báo mới</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Card 2: My Reports */}
            <div className="group rounded-3xl border-2 border-border/80 bg-card p-6 shadow-[3px_3px_0px_0px_rgba(17,24,39,0.06)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[5px_5px_0px_0px_rgba(79,70,229,0.15)]">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary shadow-2xs">
                <FileText className="size-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">
                Quản lý báo cáo của tôi
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Xem lại danh sách các tin báo bạn đã gửi, chỉnh sửa mô tả chi tiết, bổ sung ảnh chụp hoặc cập nhật tiến độ.
              </p>
              <div className="mt-6">
                <Button asChild variant="outline" className="w-full sm:w-auto group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
                  <Link href="/my-reports" className="gap-2">
                    <span>Xem danh sách của tôi</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Card 3: Browse Items */}
            <div className="group rounded-3xl border-2 border-border/80 bg-card p-6 shadow-[3px_3px_0px_0px_rgba(17,24,39,0.06)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[5px_5px_0px_0px_rgba(79,70,229,0.15)]">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary shadow-2xs">
                <Search className="size-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">
                Duyệt bảng tin toàn trường
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Tra cứu các tin báo đang mở trên toàn campus theo từ khóa, khu vực giảng đường hoặc ngày thất lạc.
              </p>
              <div className="mt-6">
                <Button asChild variant="outline" className="w-full sm:w-auto group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
                  <Link href="/items" className="gap-2">
                    <span>Khám phá bảng tin</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Card 4: My Claims */}
            <div className="group rounded-3xl border-2 border-border/80 bg-card p-6 shadow-[3px_3px_0px_0px_rgba(17,24,39,0.06)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[5px_5px_0px_0px_rgba(79,70,229,0.15)]">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary shadow-2xs">
                <HeartHandshake className="size-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">
                Quy trình &amp; Yêu cầu nhận lại
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Xem hướng dẫn xác nhận quyền sở hữu an toàn và các điểm tiếp nhận chính thức trong khuôn viên trường.
              </p>
              <div className="mt-6">
                <Button asChild variant="outline" className="w-full sm:w-auto group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
                  <Link href="/my-claims" className="gap-2">
                    <span>Xem hướng dẫn nhận đồ</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <CampusFooter />
    </div>
  );
}
