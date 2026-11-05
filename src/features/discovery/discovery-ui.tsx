import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  ImageOff,
  MapPin,
  PlusCircle,
  RotateCcw,
  Search,
  ShieldAlert,
  Tag
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories } from "@/features/reports/validation";
import { TypeBadge, StatusBadge } from "@/components/ui/badge";
import { CampusHeader } from "@/components/layout/campus-header";
import { CampusFooter } from "@/components/layout/campus-footer";
import type { DiscoveryItem, DiscoverySummary } from "./services";
import { discoveryUrl, type DiscoveryFilters } from "./validation";

export function DiscoveryShell({
  children,
  authenticated = false,
}: {
  children: ReactNode;
  authenticated?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <CampusHeader authenticated={authenticated} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <CampusFooter />
    </div>
  );
}

export function SearchFilters({ filters }: { filters: DiscoveryFilters }) {
  const hasActiveFilters = Boolean(
    filters.q || filters.type || filters.category || filters.location
  );

  return (
    <form
      key={discoveryUrl(filters, filters.page)}
      action="/items"
      method="get"
      aria-label="Tìm kiếm và lọc đồ thất lạc"
      className="mb-8 rounded-3xl border-2 border-border/80 bg-card p-5 shadow-[4px_4px_0px_0px_rgba(17,24,39,0.06)] transition-all sm:p-7"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-primary" />
          <h2 className="text-sm font-bold tracking-wide text-foreground uppercase">
            Bộ lọc &amp; Tra cứu thông minh
          </h2>
        </div>
        {hasActiveFilters && (
          <Link
            href="/items"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <RotateCcw className="size-3" />
            <span>Đặt lại tất cả</span>
          </Link>
        )}
      </div>

      {/* Main search keyword input */}
      <div>
        <label htmlFor="discovery-query" className="mb-2 block text-sm font-semibold text-foreground">
          Từ khóa tên món đồ
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="discovery-query"
            type="search"
            name="q"
            enterKeyHint="search"
            maxLength={120}
            defaultValue={filters.q}
            placeholder="Ví dụ: ví da, ba lô, thẻ sinh viên, chìa khóa..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Secondary filter fields */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Type select */}
        <div>
          <label htmlFor="discovery-type" className="mb-2 block text-sm font-semibold text-foreground">
            Phân loại tin
          </label>
          <select
            id="discovery-type"
            name="type"
            defaultValue={filters.type}
            className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 text-base text-foreground shadow-2xs outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="">Tất cả (Đồ mất &amp; Đồ nhặt)</option>
            <option value="LOST">Chỉ đồ bị mất (Cần tìm)</option>
            <option value="FOUND">Chỉ đồ nhặt được (Chờ nhận)</option>
          </select>
        </div>

        {/* Category input with datalist */}
        <div>
          <label htmlFor="discovery-category" className="mb-2 block text-sm font-semibold text-foreground">
            Danh mục đồ
          </label>
          <div className="relative">
            <Tag className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="discovery-category"
              name="category"
              list="discovery-categories"
              maxLength={80}
              defaultValue={filters.category}
              placeholder="Tất cả danh mục"
              className="pl-10"
            />
          </div>
          <datalist id="discovery-categories">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </div>

        {/* Location input */}
        <div>
          <label htmlFor="discovery-location" className="mb-2 block text-sm font-semibold text-foreground">
            Khu vực trong trường
          </label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="discovery-location"
              name="location"
              type="search"
              maxLength={200}
              defaultValue={filters.location}
              placeholder="Ví dụ: Thư viện, Giảng đường B..."
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Button type="submit" size="default" className="w-full sm:w-auto gap-2">
            <Search className="size-4" />
            <span>Tìm kiếm</span>
          </Button>
          {hasActiveFilters && (
            <Button asChild variant="outline" size="default" className="w-full sm:w-auto">
              <Link href="/items">Xóa bộ lọc</Link>
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Tìm kiếm không phân biệt chữ hoa, chữ thường.
        </p>
      </div>
    </form>
  );
}

export function DiscoveryCard({ item }: { item: DiscoverySummary }) {
  const isLost = item.type === "LOST";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border-2 border-border/80 bg-card shadow-[3px_3px_0px_0px_rgba(17,24,39,0.06)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/60 hover:shadow-[5px_5px_0px_0px_rgba(79,70,229,0.2)]">
      {/* Visual Header / Photo teaser */}
      <div className="relative flex h-36 items-center justify-center border-b border-border/60 bg-muted/50 p-4 text-center transition-colors group-hover:bg-muted/70">
        <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
          <div className="flex size-9 items-center justify-center rounded-xl bg-card text-muted-foreground shadow-2xs">
            <ImageOff className="size-4 text-muted-foreground/80" />
          </div>
          <span className="font-medium">Ảnh xem ở chi tiết</span>
        </div>

        {/* Top Badges */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
          <TypeBadge type={item.type} />
          <StatusBadge status={item.status} />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-base font-bold text-foreground transition-colors group-hover:text-primary [overflow-wrap:anywhere]">
          <Link
            href={`/items/${item.id}`}
            className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:ring-ring"
          >
            {item.title}
          </Link>
        </h2>

        {/* Item Metadata */}
        <dl className="mt-4 flex-1 space-y-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Tag className="size-3.5 text-primary shrink-0" />
            <dt className="sr-only">Danh mục</dt>
            <dd className="font-medium text-foreground/85 truncate">{item.category}</dd>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-3.5 text-orange-700 shrink-0" />
            <dt className="sr-only">Vị trí</dt>
            <dd className="font-medium text-foreground/85 truncate">{item.location}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 text-primary shrink-0" />
            <dt className="sr-only">{isLost ? "Ngày mất" : "Ngày nhặt"}</dt>
            <dd className="font-medium text-foreground/85">
              <span>{isLost ? "Mất ngày: " : "Nhặt ngày: "}</span>
              <time dateTime={item.event_date}>{item.event_date}</time>
            </dd>
          </div>
        </dl>

        {/* Button */}
        <div className="mt-5 border-t border-border/50 pt-3.5">
          <Button asChild variant="outline" size="sm" className="w-full justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
            <Link href={`/items/${item.id}`} className="gap-1.5">
              <span>Xem chi tiết</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function DiscoveryResults({
  filters,
  items,
  hasNext,
}: {
  filters: DiscoveryFilters;
  items: DiscoverySummary[];
  hasNext: boolean;
}) {
  const filtered = Boolean(
    filters.q || filters.type || filters.category || filters.location
  );

  return (
    <section aria-labelledby="results-heading">
      {/* Results header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <h2 id="results-heading" className="text-xl font-bold tracking-tight text-foreground">
          {filtered ? "Kết quả tìm kiếm" : "Báo cáo mới nhất trên campus"}
        </h2>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-primary font-semibold">
            {items.length} báo cáo
          </span>
          <span>·</span>
          <span>Trang {filters.page}</span>
        </div>
      </div>

      {/* Grid or Empty state */}
      {items.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <DiscoveryCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/80 bg-card px-6 py-16 text-center shadow-[3px_3px_0px_0px_rgba(17,24,39,0.04)]">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Search className="size-7" />
          </div>
          <h3 className="mt-5 text-xl font-bold text-foreground">
            {filtered
              ? "Không tìm thấy đồ vật phù hợp"
              : filters.page > 1
              ? "Không có báo cáo nào ở trang này"
              : "Hiện chưa có tin báo nào"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
            {filtered
              ? "Hãy thử tìm với từ khóa ngắn hơn, chọn khu vực khác hoặc bấm xóa bộ lọc để xem tất cả."
              : "Các tin báo mất đồ hoặc nhặt được trong trường sẽ xuất hiện ngay tại đây khi có người đăng."}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {filtered ? (
              <Button asChild variant="outline">
                <Link href="/items">Xóa bộ lọc &amp; xem tất cả</Link>
              </Button>
            ) : (
              filters.page > 1 && (
                <Button asChild variant="outline">
                  <Link href="/items">Quay về trang đầu</Link>
                </Button>
              )
            )}
            <Button asChild>
              <Link href="/items/new" className="gap-2">
                <PlusCircle className="size-4" />
                <span>Đăng tin báo mới</span>
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Pagination */}
      <nav
        aria-label="Phân trang danh sách"
        className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4"
      >
        {filters.page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={discoveryUrl(filters, filters.page - 1)} className="gap-1.5">
              <ChevronLeft className="size-4" />
              <span>Trang trước</span>
            </Link>
          </Button>
        ) : (
          <div />
        )}

        <span className="text-xs font-semibold text-muted-foreground">
          Trang {filters.page}
        </span>

        {hasNext ? (
          <Button asChild variant="outline" size="sm">
            <Link href={discoveryUrl(filters, filters.page + 1)} className="gap-1.5">
              <span>Trang sau</span>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <div />
        )}
      </nav>
    </section>
  );
}

export function DiscoveryDetails({ item }: { item: DiscoveryItem }) {
  const isLost = item.type === "LOST";

  return (
    <article className="rounded-3xl border-2 border-border/80 bg-card p-6 shadow-[4px_4px_0px_0px_rgba(17,24,39,0.06)] sm:p-8">
      {/* Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2">
          <TypeBadge type={item.type} />
          <StatusBadge status={item.status} />
        </div>
        <span className="text-xs text-muted-foreground">
          Mã tin: #{item.id.slice(0, 8)}
        </span>
      </div>

      {/* Title */}
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl [overflow-wrap:anywhere]">
        {item.title}
      </h1>

      {/* Meta Grid */}
      <dl className="mt-6 grid gap-4 rounded-2xl bg-secondary/40 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
        <div>
          <dt className="text-xs font-semibold text-muted-foreground uppercase">Danh mục</dt>
          <dd className="mt-1 font-bold text-foreground break-words">{item.category}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted-foreground uppercase">Khu vực trên campus</dt>
          <dd className="mt-1 font-bold text-foreground break-words">{item.location}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted-foreground uppercase">
            {isLost ? "Ngày làm mất" : "Ngày nhặt được"}
          </dt>
          <dd className="mt-1 font-bold text-foreground">
            <time dateTime={item.event_date}>{item.event_date}</time>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted-foreground uppercase">Ngày đăng tin</dt>
          <dd className="mt-1 font-bold text-foreground">
            <time dateTime={item.created_at}>{item.created_at.slice(0, 10)}</time>
          </dd>
        </div>
      </dl>

      {/* Description */}
      <div className="mt-6">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Mô tả chi tiết từ người đăng
        </h2>
        <div className="mt-2 rounded-2xl border border-border/70 bg-muted/30 p-4 sm:p-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
            {item.description || "Người đăng không bổ sung thêm mô tả văn bản."}
          </p>
        </div>
      </div>

      {/* Safe Verification & Ownership Claim Notice */}
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 sm:p-5 text-amber-950">
        <ShieldAlert className="size-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed space-y-1">
          <p className="font-bold text-amber-900 text-sm">
            Quy trình nhận lại đồ an toàn
          </p>
          <p>
            Để bảo vệ quyền lợi chính đáng của chủ sở hữu, hãy chuẩn bị trước các thông tin/bằng chứng xác thực riêng biệt (chi tiết không công khai, ảnh cũ, mật khẩu mở khóa thiết bị...) và đối chiếu trực tiếp tại văn phòng hỗ trợ của trường.
          </p>
          <p className="text-amber-800/90 pt-1">
            Tính năng gửi yêu cầu nhận đồ (Claim) trực tuyến đang được cập nhật ở phiên bản tiếp theo.
          </p>
        </div>
      </div>
    </article>
  );
}
