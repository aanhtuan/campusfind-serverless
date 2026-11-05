"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-800">
        <AlertTriangle className="size-8" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Không thể tải danh sách báo cáo
      </h1>
      <p role="alert" className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
        Vui lòng kiểm tra lại kết nối mạng và thử lại. Toàn bộ tin báo đã lưu của bạn vẫn an toàn trên hệ thống.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset} size="default" className="gap-2 rounded-xl">
          <RotateCcw className="size-4" />
          <span>Thử lại</span>
        </Button>
        <Button asChild variant="outline" size="default" className="rounded-xl">
          <Link href="/dashboard">Về Dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
