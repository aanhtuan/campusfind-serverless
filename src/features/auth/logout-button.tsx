"use client";

import { useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { createAuthService } from "./services";

export function LogoutButton() {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");

    try {
      const result = await createAuthService(createClient()).signOut();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Full navigation removes the authenticated client/router tree and caches.
      window.location.replace("/login?loggedOut=1");
    } catch {
      setError("Không thể đăng xuất. Vui lòng thử lại.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={logout}
        disabled={pending}
        className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 gap-1.5"
      >
        <LogOut className="size-3.5" />
        <span>{pending ? "Đang đăng xuất…" : "Đăng xuất"}</span>
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-rose-200">
          {error}
        </p>
      )}
    </div>
  );
}
