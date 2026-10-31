"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-2xl font-semibold">Your reports could not be loaded</h1><p role="alert" className="mt-4 text-muted-foreground">Please check your connection and try again. Your saved reports have not been removed.</p><div className="mt-6 flex flex-wrap gap-3"><Button onClick={reset}>Try again</Button><Button asChild variant="outline"><Link href="/dashboard">Dashboard</Link></Button></div></main>;
}
