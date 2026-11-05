import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  HeartHandshake,
  HelpCircle,
  Key,
  MapPin,
  PlusCircle,
  Search,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampusHeader } from "@/components/layout/campus-header";
import { CampusFooter } from "@/components/layout/campus-footer";

const howItWorks = [
  {
    step: "01",
    icon: Search,
    title: "Tìm kiếm trên bảng tin trường",
    description: "Tra cứu nhanh theo tên đồ, khu vực giảng đường, thư viện hay khoảng thời gian bị thất lạc với bộ lọc thông minh.",
  },
  {
    step: "02",
    icon: PlusCircle,
    title: "Đăng tin chỉ trong 1 phút",
    description: "Bạn vừa nhặt được chiếc ví hay để quên tai nghe? Chia sẻ ngay thông tin để cộng đồng sinh viên cùng hỗ trợ tìm kiếm.",
  },
  {
    step: "03",
    icon: ShieldCheck,
    title: "Xác nhận & Nhận lại an toàn",
    description: "Đối chiếu chi tiết nhận diện riêng biệt và hẹn nhận lại tại các điểm hỗ trợ an toàn trong khuôn viên trường.",
  },
];

const campusLocations = [
  {
    name: "Bàn trực Thư viện trung tâm",
    note: "Tiếp nhận sách, laptop, tai nghe, đồ dùng học tập",
    icon: BookOpen,
  },
  {
    name: "Văn phòng Đoàn - Hội Sinh viên",
    note: "Hỗ trợ xác minh thẻ sinh viên, ví tiền và giấy tờ tùy thân",
    icon: HeartHandshake,
  },
  {
    name: "Phòng Bảo vệ các cổng trường",
    note: "Tiếp nhận chìa khóa xe, mũ bảo hiểm và ba lô",
    icon: Key,
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only rounded-lg bg-primary p-3 text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        Chuyển thẳng đến nội dung chính
      </a>

      {/* Header */}
      <CampusHeader />

      <main id="main-content" className="flex-1">
        {/* Hero Section */}
        <section
          aria-labelledby="hero-title"
          className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-32"
        >
          {/* Subtle decorative background gradient */}
          <div
            className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
            aria-hidden="true"
          >
            <div
              className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-200 via-purple-200 to-amber-200 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
              style={{
                clipPath:
                  "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
              }}
            />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
              {/* Left Column: Heading and CTAs */}
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-xl border-2 border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-black text-primary shadow-[2px_2px_0px_0px_rgba(79,70,229,0.15)]">
                  <Sparkles className="size-3.5" />
                  <span>Bảng tin tìm đồ thất lạc trường đại học</span>
                </div>

                <h1
                  id="hero-title"
                  className="text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.15]"
                >
                  Mọi món đồ thân quen đều sẽ tìm được{" "}
                  <span className="relative inline-block text-primary">
                    đường về.
                    <span className="absolute inset-x-0 bottom-1 h-3 -z-10 bg-amber-300/60 -rotate-1 rounded-sm" />
                  </span>
                </h1>

                <p className="max-w-xl text-lg leading-relaxed text-muted-foreground font-medium">
                  Thẻ sinh viên, chiếc bình nước giữ nhiệt, ba lô học tập hay chùm chìa khóa xe...
                  CampusFind kết nối sinh viên và cán bộ giảng viên để mang lại niềm vui hội ngộ cho những món đồ thất lạc.
                </p>

                {/* Direct Action Buttons */}
                <div className="flex flex-col gap-3.5 pt-2 sm:flex-row sm:items-center">
                  <Button asChild size="lg" className="sm:w-auto">
                    <Link href="/items" className="gap-2.5">
                      <Search className="size-5" />
                      <span>Tìm kiếm đồ thất lạc</span>
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="sm:w-auto hover:bg-primary/5"
                  >
                    <Link href="/items/new" className="gap-2.5">
                      <PlusCircle className="size-5 text-primary" />
                      <span>Báo mất / Nhặt được đồ</span>
                    </Link>
                  </Button>
                </div>

                {/* Subtext guarantees */}
                <div className="flex flex-wrap items-center gap-6 pt-4 text-xs font-bold text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-primary" />
                    100% miễn phí vì cộng đồng
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-primary" />
                    Bảo mật thông tin cá nhân
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-primary" />
                    Hỗ trợ xác minh an toàn
                  </span>
                </div>
              </div>

              {/* Right Column: Interactive Campus Noticeboard Preview */}
              <div className="relative">
                <div className="relative mx-auto w-full max-w-md rounded-3xl border-2 border-border/80 bg-card p-6 shadow-[6px_6px_0px_0px_rgba(79,70,229,0.12)] sm:p-8">
                  {/* Noticeboard Header */}
                  <div className="mb-6 flex items-center justify-between border-b-2 border-border/60 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="size-3 rounded-full bg-amber-400 border border-amber-600 animate-pulse" />
                      <span className="text-xs font-black tracking-wider text-muted-foreground uppercase">
                        Bảng tin trực tiếp
                      </span>
                    </div>
                    <span className="rounded-xl border border-primary/20 bg-secondary px-2.5 py-0.5 text-xs font-black text-primary shadow-[1px_1px_0px_0px_rgba(79,70,229,0.15)]">
                      Hôm nay
                    </span>
                  </div>

                  {/* Sample Interactive Notice Cards */}
                  <div className="space-y-3.5">
                    {/* Card 1: Found card */}
                    <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/70 p-4 shadow-[2px_2px_0px_0px_rgba(16,185,129,0.15)] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(16,185,129,0.25)]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-400 bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-950">
                          <Sparkles className="size-3 text-emerald-700" /> Nhặt được
                        </span>
                        <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3 text-emerald-700" /> 15 phút trước
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-bold text-foreground">
                        Thẻ sinh viên Khoa CNTT (K47)
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1 font-medium">
                        <MapPin className="size-3 text-emerald-700 shrink-0" />
                        Giảng đường B3, phòng 302
                      </p>
                    </div>

                    {/* Card 2: Lost card */}
                    <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/70 p-4 shadow-[2px_2px_0px_0px_rgba(244,63,94,0.15)] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(244,63,94,0.25)]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 rounded-xl border border-rose-400 bg-rose-100 px-2.5 py-0.5 text-xs font-black text-rose-950">
                          <HelpCircle className="size-3 text-rose-700" /> Cần tìm
                        </span>
                        <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3 text-rose-700" /> 1 giờ trước
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-bold text-foreground">
                        Bình nước Lock&amp;Lock xanh navy có dán sticker
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1 font-medium">
                        <MapPin className="size-3 text-rose-700 shrink-0" />
                        Bàn tự học Thư viện tầng 2
                      </p>
                    </div>

                    {/* Card 3: Resolved card */}
                    <div className="rounded-2xl border-2 border-border bg-muted/50 p-3.5 opacity-90 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 rounded-xl border border-indigo-300 bg-indigo-100 px-2 py-0.5 text-[11px] font-black text-indigo-950">
                          <CheckCircle2 className="size-3 text-indigo-600" /> Đã trả lại chủ nhân
                        </span>
                        <span className="text-[11px] font-bold text-muted-foreground">Sáng nay</span>
                      </div>
                      <p className="mt-1.5 text-xs font-bold text-foreground/80">
                        Chùm chìa khóa xe Honda Smartkey
                      </p>
                    </div>
                  </div>

                  {/* Noticeboard Footer CTA */}
                  <div className="mt-6 border-t-2 border-border/60 pt-4 text-center">
                    <Link
                      href="/items"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                    >
                      <span>Xem toàn bộ danh sách đồ trên campus</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          aria-labelledby="how-it-works-title"
          className="border-t border-border bg-card/40 py-16 sm:py-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-bold tracking-widest text-primary uppercase">
                Quy trình đơn giản &amp; hiệu quả
              </p>
              <h2
                id="how-it-works-title"
                className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              >
                Cách CampusFind kết nối bạn với đồ thất lạc
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
                Được thiết kế riêng cho nhịp sống năng động và thói quen sinh hoạt trong khuôn viên đại học.
              </p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {howItWorks.map(({ step, icon: Icon, title, description }) => (
                <div
                  key={step}
                  className="group relative rounded-3xl border border-border bg-card p-8 shadow-xs transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="size-6" />
                    </div>
                    <span className="text-2xl font-black text-muted-foreground/30">
                      {step}
                    </span>
                  </div>

                  <h3 className="mt-6 text-lg font-bold text-foreground">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Safe Campus Drop-off and Pick-up Spots */}
        <section
          aria-labelledby="spots-title"
          className="py-16 sm:py-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-primary/20 bg-secondary/50 p-8 sm:p-12 lg:p-16">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <ShieldCheck className="size-3.5" />
                  <span>An toàn &amp; Đáng tin cậy</span>
                </span>
                <h2
                  id="spots-title"
                  className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
                >
                  Điểm tiếp nhận &amp; bàn giao đồ an toàn trong trường
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Để đảm bảo an toàn và quyền lợi cho cả người tìm và người nhận, hãy ưu tiên hẹn gặp hoặc gửi gắm đồ tại các điểm trực chính thức trong trường:
                </p>
              </div>

              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {campusLocations.map((loc) => {
                  const Icon = loc.icon;
                  return (
                    <div
                      key={loc.name}
                      className="rounded-2xl border border-border bg-card p-5 shadow-2xs"
                    >
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <h3 className="mt-4 text-base font-bold text-foreground">
                        {loc.name}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {loc.note}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Community Call to Action */}
        <section
          id="our-community"
          aria-labelledby="community-title"
          className="pb-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl border-2 border-primary bg-primary px-8 py-14 text-primary-foreground shadow-[6px_6px_0px_0px_rgba(17,24,39,0.15)] sm:px-14 sm:py-16">
              <div className="relative z-10 max-w-2xl space-y-4">
                <p className="text-xs font-bold tracking-widest text-indigo-200 uppercase">
                  Cộng đồng sinh viên đại học
                </p>
                <h2
                  id="community-title"
                  className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
                >
                  Một hành động nhỏ, triệu niềm vui được sẻ chia.
                </h2>
                <p className="text-base leading-relaxed text-indigo-100">
                  Khi nhặt được một món đồ, chỉ cần dành ra một phút chia sẻ lên CampusFind.
                  Bạn vừa giúp một người bạn cùng trường tìm lại tài sản quan trọng và cả một ngày bình yên.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-4">
                  <Button
                    asChild
                    size="lg"
                    className="rounded-xl bg-white text-primary hover:bg-indigo-50 font-bold shadow-[2px_2px_0px_0px_rgba(17,24,39,0.1)]"
                  >
                    <Link href="/items/new">Báo mất hoặc nhặt đồ ngay</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="rounded-xl border-white/30 bg-transparent text-white hover:bg-white/10"
                  >
                    <Link href="/items">Duyệt bảng tin</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <CampusFooter />
    </div>
  );
}
