"use client";

import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { runWorkflow } from "./services";
import type { WorkflowRequest } from "../../../supabase/functions/_shared/validation";

const subscribe = () => () => {};

export function useWorkflow() {
  const router = useRouter();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const ready = useSyncExternalStore(subscribe, () => true, () => false);

  async function run(request: WorkflowRequest, next?: (id: string) => void) {
    if (!ready || lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const id = await runWorkflow(createClient(), request);
      setMessage("Đã lưu thay đổi.");
      next?.(id);
      router.refresh();
    } catch {
      setMessage(
        "Chưa xác nhận được thao tác. Vui lòng tải lại dữ liệu trước khi thử lại; trạng thái có thể đã thay đổi."
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return { run, disabled: !ready || busy, message, router, busy };
}

export function WorkflowButton({
  request,
  children,
  variant = "outline",
  className,
}: {
  request: WorkflowRequest;
  children: ReactNode;
  variant?: "default" | "outline" | "destructive" | "secondary";
  className?: string;
}) {
  const operation = useWorkflow();

  return (
    <div className="inline-block">
      <Button
        type="button"
        variant={variant}
        disabled={operation.disabled}
        onClick={() => void operation.run(request)}
        className={className}
      >
        {operation.busy && <Loader2 className="mr-1.5 size-4 animate-spin" />}
        {children}
      </Button>
      {operation.message && (
        <p
          role="status"
          className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary"
        >
          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
          <span>{operation.message}</span>
        </p>
      )}
    </div>
  );
}
