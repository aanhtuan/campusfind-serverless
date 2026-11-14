"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-2xl font-semibold">Chưa tải được trang này</h1><p role="alert" className="mt-4">Vui lòng kiểm tra kết nối và thử lại. Nếu thao tác trước bị gián đoạn, hãy tải lại dữ liệu trước khi gửi lại.</p><div className="mt-6 flex flex-wrap gap-4"><Button onClick={reset}>Thử lại</Button><Link href="/dashboard" className="py-3 underline">Dashboard</Link></div></main>;
}
