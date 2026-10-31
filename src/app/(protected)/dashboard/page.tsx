import Link from "next/link";
import { requireUser } from "@/features/auth/server";
import { LogoutButton } from "@/features/auth/logout-button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await requireUser("/dashboard");
  const client = await createClient();
  const { data: profile, error } = await client.from("profiles").select("display_name, role").eq("id", user.id).maybeSingle();
  return <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6"><header className="flex flex-wrap items-center justify-between gap-4"><Link href="/" className="text-xl font-bold text-primary">CampusFind</Link><LogoutButton /></header><section className="mt-8 rounded-xl border p-6"><h1 className="text-2xl font-semibold">Your dashboard</h1>{error || !profile ? <p role="alert" className="mt-4 text-muted-foreground">Your profile could not be loaded. Refresh to try again.</p> : <dl className="mt-6 grid gap-5 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Display name</dt><dd className="break-words font-medium">{profile.display_name || "Name not set"}</dd></div><div><dt className="text-sm text-muted-foreground">Email</dt><dd className="break-all font-medium">{user.email || "Email unavailable"}</dd></div><div><dt className="text-sm text-muted-foreground">Account role</dt><dd className="font-medium">{profile.role}</dd></div></dl>}<nav aria-label="Your reports" className="mt-8 flex flex-wrap gap-3"><Link href="/items/new" className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-white">Report a lost or found item</Link><Link href="/my-reports" className="inline-flex min-h-11 items-center rounded-md border border-primary/20 px-4 text-sm font-medium">Manage my reports</Link></nav></section></main>;
}
