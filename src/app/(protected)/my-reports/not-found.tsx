import Link from "next/link";
export default function NotFound() {
  return <main className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-2xl font-semibold">Report unavailable</h1><p className="mt-4 text-muted-foreground">This report does not exist or is not in your account.</p><Link href="/my-reports" className="mt-6 inline-block py-3 text-primary underline">Back to my reports</Link></main>;
}
