import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Calendar, MapPin, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampusHeader } from "@/components/layout/campus-header";
import { CampusFooter } from "@/components/layout/campus-footer";
import { TypeBadge, StatusBadge } from "@/components/ui/badge";
import type { ItemReport } from "./types";

export function ReportShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <CampusHeader authenticated={true} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Heading */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span>Quản lý tin báo trường học</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {subtitle}
          </p>
        </div>

        {children}
      </main>
      <CampusFooter />
    </div>
  );
}

export { StatusBadge };

export function ReportCard({ report }: { report: ItemReport }) {
  const isLost = report.type === "LOST";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border-2 border-border/80 bg-card p-5 shadow-[3px_3px_0px_0px_rgba(17,24,39,0.06)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/60 hover:shadow-[5px_5px_0px_0px_rgba(79,70,229,0.2)]">
      {/* Top badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <TypeBadge type={report.type} />
        <StatusBadge status={report.status} />
      </div>

      {/* Title */}
      <h2 className="mt-3.5 text-base font-bold text-foreground transition-colors group-hover:text-primary [overflow-wrap:anywhere]">
        <Link
          href={`/my-reports/${report.id}`}
          className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:ring-ring"
        >
          {report.title}
        </Link>
      </h2>

      {/* Meta items */}
      <dl className="mt-4 flex-1 space-y-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Tag className="size-3.5 text-primary shrink-0" />
          <dt className="sr-only">Danh mục</dt>
          <dd className="font-medium text-foreground/85 truncate">{report.category}</dd>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-3.5 text-orange-700 shrink-0" />
          <dt className="sr-only">Khu vực</dt>
          <dd className="font-medium text-foreground/85 truncate">{report.location}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="size-3.5 text-primary shrink-0" />
          <dt className="sr-only">{isLost ? "Ngày mất" : "Ngày nhặt"}</dt>
          <dd className="font-medium text-foreground/85">
            <span>{isLost ? "Mất ngày: " : "Nhặt ngày: "}</span>
            <time dateTime={report.event_date}>{report.event_date}</time>
          </dd>
        </div>
      </dl>

      {/* Action CTA */}
      <div className="mt-5 border-t border-border/60 pt-3.5">
        <Button asChild variant="outline" size="sm" className="w-full justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
          <Link href={`/my-reports/${report.id}`} className="gap-1.5">
            <span>Quản lý &amp; Xem ảnh</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
