"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { createAuthService } from "./services";
import { emailSchema, loginSchema, registerSchema } from "./validation";
import { safeReturnPath } from "./navigation";
import { initializeProfileName } from "./profile";

type Mode = "login" | "register" | "verify";
export function AuthForm({ mode, next, reason, loggedOut }: { mode: Mode; next?: string; reason?: string; loggedOut?: boolean }) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [wait, setWait] = useState(0);
  useEffect(() => {
    if (!wait) return;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  const returnTo = safeReturnPath(next);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || (mode === "verify" && wait > 0)) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const result = mode === "register" ? registerSchema.safeParse(values) : mode === "login" ? loginSchema.safeParse(values) : emailSchema.safeParse(values.email);
    setMessage(""); setFailed(false);
    if (!result.success) {
      const issues: Record<string, string> = {};
      for (const issue of result.error.issues) issues[String(issue.path[0] ?? "email")] ??= issue.message;
      setErrors(issues);
      form.querySelector<HTMLInputElement>(`[name="${Object.keys(issues)[0]}"]`)?.focus();
      return;
    }
    setErrors({}); busy.current = true; setPending(true);
    try {
      const client = createClient();
      const service = createAuthService(client);
      const email = String(values.email);
      const password = String(values.password ?? "");
      const response = mode === "register"
        ? await service.signUp({ email, password, displayName: String(values.displayName) }, returnTo)
        : mode === "login" ? await service.signInWithPassword({ email, password })
        : await service.resendVerificationEmail(email, returnTo);
      if (mode === "verify") setWait(60);
      if (!response.ok) { setFailed(true); setMessage(response.error); return; }
      if (mode === "login") {
        const user = await service.getCurrentUser();
        if (!user) { setFailed(true); setMessage("Unable to verify your session. Please sign in again."); return; }
        await initializeProfileName(client, user);
        router.replace(returnTo); router.refresh();
      } else if (mode === "register") {
        form.reset();
        // No email/password in URL, browser storage or logs; neutral for duplicates.
        router.replace(`/verify-email?next=${encodeURIComponent(returnTo)}&sent=1`);
      } else setMessage("If this account can receive verification emails, a link has been sent. Check your inbox and spam folder.");
    } catch { setFailed(true); setMessage("Authentication is unavailable. Please try again later."); }
    finally { busy.current = false; setPending(false); }
  }
  function field(name: string, label: string, type: string, autoComplete: string) {
    return <div className="space-y-2"><label className="text-sm font-medium" htmlFor={name}>{label}</label><Input id={name} name={name} type={type} autoComplete={autoComplete} disabled={pending} required aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} />{errors[name] && <p id={`${name}-error`} className="text-sm text-destructive">{errors[name]}</p>}</div>;
  }
  return <div className="space-y-6">
    {loggedOut && <p role="status" className="text-sm">You have signed out.</p>}
    {reason === "confirmation_failed" && <p role="alert" className="text-sm text-destructive">The confirmation link is invalid or expired. Request a new link, or open the latest email in the browser where you registered. <Link className="underline" href={`/verify-email?next=${encodeURIComponent(returnTo)}`}>Resend verification</Link></p>}
    {mode === "verify" && <p className="text-sm text-muted-foreground">If registration is eligible, check your inbox and spam folder for a confirmation link. Open it in the same browser where you registered. Enter your email below to request another link.</p>}
    <form noValidate onSubmit={submit} className="space-y-4" aria-busy={pending}>
      {mode === "register" && field("displayName", "Display name", "text", "nickname")}
      {field("email", "Email", "email", "email")}
      {mode !== "verify" && <>
        {field("password", "Password", visible ? "text" : "password", mode === "register" ? "new-password" : "current-password")}
        {mode === "register" && <><p className="text-xs text-muted-foreground">Use 8–128 characters. A long, unique password is recommended.</p>{field("confirmPassword", "Confirm password", visible ? "text" : "password", "new-password")}</>}
        <Button type="button" variant="outline" aria-pressed={visible} disabled={pending} onClick={() => setVisible(!visible)}>{visible ? "Hide passwords" : "Show passwords"}</Button>
      </>}
      <div aria-live="polite" aria-atomic="true">{message && <p role={failed ? "alert" : "status"} className={`text-sm ${failed ? "text-destructive" : "text-foreground"}`}>{message}</p>}</div>
      <Button className="w-full" type="submit" disabled={pending || wait > 0}>{pending ? "Please wait…" : wait > 0 ? `Try again in ${wait}s` : mode === "register" ? "Create account" : mode === "login" ? "Sign in" : "Resend verification email"}</Button>
    </form>
    <p className="text-sm text-muted-foreground">{mode === "login" ? <>New to CampusFind? <Link className="font-medium text-primary underline" href={`/register?next=${encodeURIComponent(returnTo)}`}>Create an account</Link></> : <Link className="font-medium text-primary underline" href={`/login?next=${encodeURIComponent(returnTo)}`}>Back to sign in</Link>}</p>
    {mode === "login" && <Link className="block text-sm underline" href={`/verify-email?next=${encodeURIComponent(returnTo)}`}>Need another confirmation email?</Link>}
  </div>;
}
