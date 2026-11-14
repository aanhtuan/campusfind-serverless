import Link from "next/link";
export default function NotFound() { return <main className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-2xl font-semibold">Không tìm thấy dữ liệu</h1><p className="mt-4">Dữ liệu không tồn tại hoặc tài khoản của bạn không có quyền truy cập.</p><Link href="/dashboard" className="mt-6 inline-flex min-h-11 items-center underline">Dashboard</Link></main>; }
