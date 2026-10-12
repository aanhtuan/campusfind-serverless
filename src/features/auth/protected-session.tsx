"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { createAuthService } from "./services";
import { loginDestination } from "./navigation";
import { createSessionMonitor } from "./session-monitor";

export function ProtectedSession({ userId, children }: { userId: string; children: ReactNode }) {
  const [verified, setVerified] = useState(false);
  const protectedContent = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const toLogin = () => window.location.replace(loginDestination(window.location.pathname + window.location.search).toString());
    let client: ReturnType<typeof createClient>;
    try { client = createClient(); } catch { toLogin(); return; }
    const monitor = createSessionMonitor({
      expectedUserId: userId,
      verify: async () => (await createAuthService(client).getCurrentUser())?.id ?? null,
      onPending: () => {
        // Hide immediately, including a restored page before React commits.
        if (protectedContent.current) protectedContent.current.hidden = true;
        setVerified(false);
      },
      onVerified: () => setVerified(true),
      onSignedOut: toLogin,
      onIdentityChanged: () => window.location.reload(),
    });
    const { data: { subscription } } = client.auth.onAuthStateChange(event => monitor.event(event));
    const resume = () => { void monitor.check(); };
    const suspend = () => flushSync(() => monitor.suspend());
    const visibility = () => { if (document.visibilityState === "visible") resume(); else suspend(); };
    window.addEventListener("pageshow", resume);
    window.addEventListener("pagehide", suspend);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", visibility);
    resume();
    return () => {
      monitor.dispose(); subscription.unsubscribe();
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("pagehide", suspend);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [userId]);
  return <>{!verified && <p role="status" className="px-6 py-12">Checking your session…</p>}<div ref={protectedContent} hidden={!verified}>{children}</div></>;
}
