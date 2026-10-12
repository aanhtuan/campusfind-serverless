import Link from "next/link";
import { AuthForm } from "./auth-form";

type Query = Promise<Record<string, string | string[] | undefined>>;
export async function AuthPage({ mode, searchParams }: { mode: "login" | "register" | "verify"; searchParams: Query }) {
  const query = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12"><section className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm sm:p-8"><Link href="/" className="text-lg font-bold text-primary">CampusFind</Link><h1 className="mb-2 mt-6 text-2xl font-semibold">{mode === "login" ? "Welcome back" : mode === "register" ? "Create your account" : "Verify your email"}</h1><p className="mb-6 text-sm text-muted-foreground">{mode === "login" ? "Sign in to your campus community." : mode === "register" ? "Join CampusFind to reconnect people with their belongings." : "Confirm your email before signing in."}</p><AuthForm mode={mode} next={typeof query.next === "string" ? query.next : undefined} reason={typeof query.reason === "string" ? query.reason : undefined} loggedOut={query.loggedOut === "1"} /></section></main>;
}
