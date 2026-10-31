"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { categories, createReportSchema, editReportSchema } from "./validation";
import { createReport, updateReport } from "./services";
import type { ItemReport } from "./types";

const subscribe = () => () => {};
const fieldClass = "min-h-11 w-full rounded-md border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive";
export function ReportForm({ report }: { report?: ItemReport }) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || savedId) return;
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(["title", "description", "category", "location", "event_date"].map(key => [key, form.get(key)]));
    const parsed = report ? editReportSchema.safeParse(values) : createReportSchema.safeParse({ ...values, type: form.get("type") });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message])));
      setMessage("Please correct the highlighted fields.");
      return;
    }
    inFlight.current = true; setBusy(true); setErrors({}); setMessage("");
    try {
      const client = createClient();
      if (report) {
        await updateReport(client, report.id, parsed.data);
        setSavedId(report.id); setMessage("Changes saved."); router.refresh();
      } else {
        const id = await createReport(client, parsed.data);
        setSavedId(id); setMessage("Report saved. You can now add up to three optional photos.");
      }
    } catch {
      setMessage(report ? "We could not confirm the update. Reload your report before retrying." : "We could not confirm the save. Check My reports before submitting again to avoid duplicates.");
    } finally { inFlight.current = false; setBusy(false); }
  }
  function error(name: string) { return errors[name] ? <p id={`${name}-error`} className="mt-1 text-sm text-destructive">{errors[name]}</p> : null; }
  function aria(name: string) { return { "aria-invalid": Boolean(errors[name]), "aria-describedby": errors[name] ? `${name}-error` : undefined }; }
  return <form method="post" onSubmit={submit} noValidate className="max-w-3xl rounded-xl border border-primary/15 bg-white p-5 shadow-sm sm:p-8">
    <p className="mb-6 rounded-lg bg-muted p-4 text-sm text-muted-foreground">Report details can be shown in campus discovery. Keep passwords, contact details and private ownership evidence out of your description. {report ? "Report type and ownership cannot be changed." : "Save the details first, then add optional photos."}</p>
    <fieldset disabled={!hydrated || busy || Boolean(savedId)} className="min-w-0 space-y-6 disabled:opacity-70">
      {report ? <p className="font-medium">Report type: {report.type}</p> : <div><label htmlFor="type" className="mb-2 block font-medium">Report type</label><select id="type" name="type" defaultValue="LOST" className={fieldClass} {...aria("type")}><option value="LOST">I lost an item</option><option value="FOUND">I found an item</option></select>{error("type")}</div>}
      <div><label htmlFor="title" className="mb-2 block font-medium">Title <span className="text-sm text-muted-foreground">(required)</span></label><Input id="title" name="title" required maxLength={200} defaultValue={report?.title} placeholder="e.g. Black backpack near the library" {...aria("title")} />{error("title")}</div>
      <div><label htmlFor="description" className="mb-2 block font-medium">Description <span className="text-sm text-muted-foreground">(optional)</span></label><textarea id="description" name="description" rows={5} maxLength={5000} defaultValue={report?.description ?? ""} placeholder="Describe the item without disclosing private identifying details." className={`${fieldClass} resize-y`} {...aria("description")} />{error("description")}</div>
      <div className="grid gap-6 sm:grid-cols-2"><div><label htmlFor="category" className="mb-2 block font-medium">Category</label><Input id="category" name="category" list="report-categories" required maxLength={80} defaultValue={report?.category} placeholder="Choose or enter a category" {...aria("category")} /><datalist id="report-categories">{categories.map(category => <option key={category} value={category} />)}</datalist>{error("category")}</div><div><label htmlFor="event_date" className="mb-2 block font-medium">{report?.type === "FOUND" ? "Date found" : "Date lost or found"}</label><Input id="event_date" type="date" name="event_date" required defaultValue={report?.event_date} {...aria("event_date")} />{error("event_date")}</div></div>
      <div><label htmlFor="location" className="mb-2 block font-medium">Campus location</label><Input id="location" name="location" required maxLength={200} defaultValue={report?.location} placeholder="e.g. Library, ground floor" {...aria("location")} />{error("location")}</div>
      <Button type="submit" size="lg" className="w-full sm:w-auto">{busy ? "Saving…" : report ? "Save changes" : "Save report"}</Button>
    </fieldset>
    {!hydrated && <p className="mt-4 text-sm text-muted-foreground">JavaScript is required to save a report securely.</p>}
    {message && <p role={savedId ? "status" : "alert"} aria-live="polite" className={`mt-5 ${savedId ? "text-primary" : "text-destructive"}`}>{message}</p>}
    {savedId && <Button asChild className="mt-4"><Link href={`/my-reports/${savedId}`}>{report ? "View updated report" : "Manage report & add photos"}</Link></Button>}
    <Link href="/my-reports" className="mt-5 block w-fit py-2 text-sm text-primary underline">Back to my reports</Link>
  </form>;
}
