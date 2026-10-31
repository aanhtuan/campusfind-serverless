import Link from "next/link";
export default function NotFound() {
  return <main className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-2xl font-semibold">Item unavailable</h1><p className="mt-4 text-muted-foreground">This report does not exist or is not visible to your current session.</p><Link href="/items" className="mt-6 inline-flex min-h-11 items-center text-primary underline">Browse campus items</Link></main>;
}
