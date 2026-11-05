import Link from "next/link";
import { HelpCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-3xl bg-secondary text-primary">
        <HelpCircle className="size-8" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Món đồ không khả dụng
      </h1>
      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
        Tin báo này không tồn tại hoặc không thể hiển thị trong phiên làm việc hiện tại của bạn.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="default" className="rounded-xl">
          <Link href="/items" className="gap-2">
            <Search className="size-4" />
            <span>Duyệt bảng tin đồ thất lạc</span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="default" className="rounded-xl">
          <Link href="/">Về trang chủ</Link>
        </Button>
      </div>
    </main>
  );
}
