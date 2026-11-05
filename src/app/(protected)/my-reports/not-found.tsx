import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-3xl bg-secondary text-primary">
        <FileQuestion className="size-8" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Báo cáo không khả dụng
      </h1>
      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
        Tin báo này không tồn tại hoặc không thuộc tài khoản trường học của bạn.
      </p>
      <div className="mt-8">
        <Button asChild size="default" className="rounded-xl">
          <Link href="/my-reports">Quay lại danh sách báo cáo của tôi</Link>
        </Button>
      </div>
    </main>
  );
}
