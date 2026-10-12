"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { createAuthService } from "./services";

export function LogoutButton() {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError("");
    try {
      const result = await createAuthService(createClient()).signOut();
      if (!result.ok) { setError(result.error); return; }
      // Full navigation removes the authenticated client/router tree and caches.
      window.location.replace("/login?loggedOut=1");
    } catch { setError("Unable to sign out. Please try again."); }
    finally { busy.current = false; setPending(false); }
  }
  return <div><Button variant="outline" onClick={logout} disabled={pending}>{pending ? "Signing out…" : "Sign out"}</Button>{error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}</div>;
}
