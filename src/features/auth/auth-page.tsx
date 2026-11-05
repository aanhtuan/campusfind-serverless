import Link from "next/link";
import { CheckCircle2, HeartHandshake, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { AuthForm } from "./auth-form";

type Query = Promise<Record<string, string | string[] | undefined>>;

export async function AuthPage({
  mode,
  searchParams,
}: {
  mode: "login" | "register" | "verify";
  searchParams: Query;
}) {
  const query = await searchParams;
  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isVerify = mode === "verify";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top Simple Header */}
      <header className="border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl transition-transform active:scale-95"
            aria-label="Về trang chủ CampusFind"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-2xs">
              <MapPin className="size-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              CampusFind
              <span className="inline-block size-1.5 rounded-full bg-amber-500 ml-1" />
            </span>
          </Link>

          <Link
            href="/items"
            className="text-xs font-semibold text-primary hover:underline sm:text-sm"
          >
            ← Bảng tin tìm đồ
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-4xl">
          <div className="overflow-hidden rounded-3xl border-2 border-border/80 bg-card shadow-[6px_6px_0px_0px_rgba(79,70,229,0.18)] lg:grid lg:grid-cols-[1fr_1.15fr]">
            {/* Left Decorative/Info Panel */}
            <div className="relative flex flex-col justify-between bg-primary p-8 text-primary-foreground sm:p-10">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-xs">
                  <Sparkles className="size-3.5 text-amber-300" />
                  <span>Cổng kết nối trường đại học</span>
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {isLogin
                    ? "Chào mừng quay lại · Welcome back"
                    : isRegister
                    ? "Tạo tài khoản · Create your account"
                    : "Xác minh email · Verify your email"}
                </h2>

                <p className="text-sm leading-relaxed text-indigo-100/90">
                  {isLogin
                    ? "Đăng nhập để quản lý các món đồ đã báo mất, đăng tin nhặt được hoặc trao đổi nhận lại an toàn."
                    : isRegister
                    ? "Tạo tài khoản chỉ mất chưa đầy một phút để đăng tin báo và theo dõi đồ thất lạc mọi lúc, mọi nơi."
                    : "Xác thực địa chỉ email để đảm bảo tính an toàn và minh bạch cho cộng đồng trường học."}
                </p>

                <div className="space-y-3 pt-2 text-xs text-indigo-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-300 shrink-0" />
                    <span>Dành cho toàn thể sinh viên và cán bộ giảng viên</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-amber-300 shrink-0" />
                    <span>Bảo mật tuyệt đối, không chia sẻ email công khai</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="size-4 text-rose-300 shrink-0" />
                    <span>Hỗ trợ bàn giao đồ tại các văn phòng chính thức</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-white/20 pt-4 text-xs text-indigo-200/80">
                CampusFind · Kết nối và sẻ chia vì một học đường ấm áp.
              </div>
            </div>

            {/* Right Form Container */}
            <div className="p-6 sm:p-10">
              {/* Tabs for Login / Register */}
              {!isVerify && (
                <div className="mb-6 flex rounded-xl bg-muted p-1 text-sm font-semibold">
                  <Link
                    href={`/login${query.next ? `?next=${encodeURIComponent(String(query.next))}` : ""}`}
                    className={`flex-1 rounded-lg py-2 text-center transition-all ${
                      isLogin
                        ? "bg-card text-foreground shadow-2xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href={`/register${query.next ? `?next=${encodeURIComponent(String(query.next))}` : ""}`}
                    className={`flex-1 rounded-lg py-2 text-center transition-all ${
                      isRegister
                        ? "bg-card text-foreground shadow-2xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Đăng ký tài khoản
                  </Link>
                </div>
              )}

              <AuthForm
                mode={mode}
                next={typeof query.next === "string" ? query.next : undefined}
                reason={typeof query.reason === "string" ? query.reason : undefined}
                loggedOut={query.loggedOut === "1"}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CampusFind · Ứng dụng tìm đồ thất lạc trường học
      </footer>
    </div>
  );
}
