import Link from "next/link";
import type { ReactNode } from "react";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ItemReport } from "./types";

export function ReportShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
    <header className="mb-9 flex flex-wrap items-center justify-between gap-4 border-b border-primary/15 pb-5">
      <Link href="/dashboard" className="flex min-h-11 items-center gap-2 text-lg font-bold text-primary"><MapPin aria-hidden="true" className="size-5" />CampusFind</Link>
      <nav aria-label="Reporting navigation" className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/my-reports">My reports</Link></Button><Button asChild><Link href="/items/new"><Plus aria-hidden="true" />New report</Link></Button></nav>
    </header>
    <div className="mb-7"><p className="mb-2 text-xs font-semibold tracking-widest text-primary uppercase">Campus lost &amp; found</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1><p className="mt-3 max-w-2xl text-muted-foreground">{subtitle}</p></div>
    {children}
  </main>;
}
export function StatusBadge({ status }: { status: ItemReport["status"] }) {
  return <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{status.replaceAll("_", " ")}</span>;
}
export function ReportCard({ report }: { report: ItemReport }) {
  return <article className="min-w-0 rounded-xl border border-primary/15 bg-white p-5 shadow-sm">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold tracking-widest text-primary">{report.type}</span><StatusBadge status={report.status} /></div>
    <h2 className="text-xl font-semibold [overflow-wrap:anywhere]"><Link href={`/my-reports/${report.id}`} className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-ring">{report.title}</Link></h2>
    <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-muted-foreground">Category</dt><dd className="break-words">{report.category}</dd></div><div><dt className="text-muted-foreground">Campus location</dt><dd className="break-words">{report.location}</dd></div><div><dt className="text-muted-foreground">{report.type === "LOST" ? "Lost on" : "Found on"}</dt><dd><time dateTime={report.event_date}>{report.event_date}</time></dd></div></dl>
    <Button asChild variant="outline" className="mt-5 w-full"><Link href={`/my-reports/${report.id}`}>Manage report</Link></Button>
  </article>;
}
