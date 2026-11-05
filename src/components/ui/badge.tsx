import * as React from "react";
import { CheckCircle2, Clock, HelpCircle, Sparkles, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TypeBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  type: "LOST" | "FOUND" | string;
  showIcon?: boolean;
}

export function TypeBadge({ type, showIcon = true, className, ...props }: TypeBadgeProps) {
  const isLost = type.toUpperCase() === "LOST";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-black tracking-wide uppercase transition-transform hover:-translate-y-0.5",
        isLost
          ? "bg-rose-100 text-rose-950 border-2 border-rose-400 shadow-[2px_2px_0px_0px_rgba(225,29,72,0.2)]"
          : "bg-emerald-100 text-emerald-950 border-2 border-emerald-400 shadow-[2px_2px_0px_0px_rgba(5,150,105,0.2)]",
        className
      )}
      {...props}
    >
      {showIcon && (
        isLost ? (
          <HelpCircle aria-hidden="true" className="size-3.5 stroke-[2.8] text-rose-700" />
        ) : (
          <Sparkles aria-hidden="true" className="size-3.5 stroke-[2.8] text-emerald-700" />
        )
      )}
      <span>{isLost ? "Mất đồ · Lost" : "Nhặt được · Found"}</span>
    </span>
  );
}

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: "OPEN" | "RESOLVED" | "CLOSED" | string;
  showIcon?: boolean;
}

export function StatusBadge({ status, showIcon = true, className, ...props }: StatusBadgeProps) {
  const upper = status.toUpperCase();
  const isOpen = upper === "OPEN";
  const isResolved = upper === "RESOLVED";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all",
        isOpen && "bg-amber-100 text-amber-950 border border-amber-300 shadow-[1px_1px_0px_0px_rgba(245,158,11,0.25)]",
        isResolved && "bg-indigo-100 text-indigo-950 border border-indigo-300 shadow-[1px_1px_0px_0px_rgba(79,70,229,0.25)]",
        !isOpen && !isResolved && "bg-slate-100 text-slate-800 border border-slate-300",
        className
      )}
      {...props}
    >
      {showIcon && (
        isOpen ? (
          <Clock aria-hidden="true" className="size-3 stroke-[2.4] text-amber-700" />
        ) : isResolved ? (
          <CheckCircle2 aria-hidden="true" className="size-3 stroke-[2.4] text-indigo-700" />
        ) : (
          <XCircle aria-hidden="true" className="size-3 stroke-[2.4] text-slate-500" />
        )
      )}
      <span>
        {isOpen ? "Đang tìm kiếm" : isResolved ? "Đã trao lại" : status.replaceAll("_", " ")}
      </span>
    </span>
  );
}
