import Link from "next/link";
import { Heart, MapPin, ShieldCheck, Sparkles } from "lucide-react";

export function CampusFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-card/60 backdrop-blur-xs">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand Col */}
          <div className="space-y-3 sm:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold text-foreground">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
                <MapPin className="size-4" />
              </span>
              <span>CampusFind</span>
            </Link>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Nền tảng kết nối và hỗ trợ tìm kiếm đồ thất lạc dành cho cộng đồng sinh viên và cán bộ giảng viên trường đại học.
              Giúp mọi món đồ thất lạc sớm tìm được đường về với chủ nhân.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Chung tay xây dựng khuôn viên văn minh, tương trợ</span>
            </div>
          </div>

          {/* Nav Col 1 */}
          <div>
            <h3 className="text-xs font-bold tracking-wider text-foreground uppercase">Tính năng chính</h3>
            <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="/items" className="hover:text-primary transition-colors">
                  Duyệt tìm đồ thất lạc
                </Link>
              </li>
              <li>
                <Link href="/items/new" className="hover:text-primary transition-colors">
                  Báo mất hoặc nhặt đồ
                </Link>
              </li>
              <li>
                <Link href="/my-reports" className="hover:text-primary transition-colors">
                  Quản lý báo cáo của tôi
                </Link>
              </li>
              <li>
                <Link href="/my-claims" className="hover:text-primary transition-colors">
                  Yêu cầu nhận lại đồ
                </Link>
              </li>
            </ul>
          </div>

          {/* Nav Col 2 */}
          <div>
            <h3 className="text-xs font-bold tracking-wider text-foreground uppercase">Hỗ trợ & An toàn</h3>
            <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
              <li>
                <span className="block text-foreground/80 font-medium">Điểm hẹn an toàn:</span>
                <span className="text-xs text-muted-foreground">Phòng Bảo vệ · Bàn trực Thư viện · Văn phòng Đoàn</span>
              </li>
              <li className="pt-2">
                <div className="flex items-start gap-1.5 text-xs text-amber-900 bg-amber-50/80 border border-amber-200/60 p-2.5 rounded-lg">
                  <ShieldCheck className="size-4 shrink-0 text-amber-700 mt-0.5" />
                  <span>Luôn đối chiếu đặc điểm nhận dạng trực tiếp khi bàn giao.</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} CampusFind. Vì cộng đồng sinh viên và trường học.</p>
          <p className="flex items-center gap-1.5">
            <span>Được phát triển với</span>
            <Heart className="size-3.5 fill-rose-500 text-rose-500" />
            <span>tinh thần hỗ trợ học đường</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
