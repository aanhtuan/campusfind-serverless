"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { createAuthService } from "./services";
import { emailSchema, loginSchema, registerSchema } from "./validation";
import { safeReturnPath } from "./navigation";
import { initializeProfileName } from "./profile";

type Mode = "login" | "register" | "verify";
const subscribeToHydration = () => () => {};

export function AuthForm({
  mode,
  next,
  reason,
  loggedOut,
}: {
  mode: Mode;
  next?: string;
  reason?: string;
  loggedOut?: boolean;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
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
    if (!ready || busy.current || (mode === "verify" && wait > 0)) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const result =
      mode === "register"
        ? registerSchema.safeParse(values)
        : mode === "login"
        ? loginSchema.safeParse(values)
        : emailSchema.safeParse(values.email);

    setMessage("");
    setFailed(false);

    if (!result.success) {
      const issues: Record<string, string> = {};
      for (const issue of result.error.issues) {
        issues[String(issue.path[0] ?? "email")] ??= issue.message;
      }
      setErrors(issues);
      form.querySelector<HTMLInputElement>(`[name="${Object.keys(issues)[0]}"]`)?.focus();
      return;
    }

    setErrors({});
    busy.current = true;
    setPending(true);

    try {
      const client = createClient();
      const service = createAuthService(client);
      const email = String(values.email);
      const password = String(values.password ?? "");

      const response =
        mode === "register"
          ? await service.signUp(
              { email, password, displayName: String(values.displayName) },
              returnTo
            )
          : mode === "login"
          ? await service.signInWithPassword({ email, password })
          : await service.resendVerificationEmail(email, returnTo);

      if (mode === "verify") setWait(60);

      if (!response.ok) {
        setFailed(true);
        setMessage(response.error);
        return;
      }

      if (mode === "login") {
        const user = await service.getCurrentUser();
        if (!user) {
          setFailed(true);
          setMessage("Không thể xác minh phiên của bạn. Vui lòng đăng nhập lại.");
          return;
        }
        await initializeProfileName(client, user);
        router.replace(returnTo);
        router.refresh();
      } else if (mode === "register") {
        form.reset();
        router.replace(`/verify-email?next=${encodeURIComponent(returnTo)}&sent=1`);
      } else {
        setMessage(
          "Nếu tài khoản hợp lệ, liên kết xác minh đã được gửi. Vui lòng kiểm tra hộp thư đến và thư mục spam."
        );
      }
    } catch {
      setFailed(true);
      setMessage("Hệ thống xác thực tạm thời gián đoạn. Vui lòng thử lại sau.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  function field(
    name: string,
    label: string,
    type: string,
    autoComplete: string,
    placeholder?: string
  ) {
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-foreground" htmlFor={name}>
          {label}
        </label>
        <div className="relative">
          <Input
            id={name}
            name={name}
            type={type}
            autoComplete={autoComplete}
            disabled={!ready || pending}
            required
            placeholder={placeholder}
            aria-invalid={!!errors[name]}
            aria-describedby={errors[name] ? `${name}-error` : undefined}
          />
        </div>
        {errors[name] && (
          <p id={`${name}-error`} className="flex items-center gap-1.5 text-xs font-medium text-destructive">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>{errors[name]}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {loggedOut && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-900"
        >
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <span>Bạn đã đăng xuất thành công khỏi hệ thống.</span>
        </div>
      )}

      {reason === "confirmation_failed" && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <p className="font-semibold">Liên kết xác nhận đã hết hạn hoặc không hợp lệ.</p>
            <p>
              Vui lòng yêu cầu liên kết mới hoặc mở email mới nhất trên cùng trình duyệt bạn đã đăng ký.{" "}
              <Link
                className="font-bold underline"
                href={`/verify-email?next=${encodeURIComponent(returnTo)}`}
              >
                Gửi lại email xác minh
              </Link>
            </p>
          </div>
        </div>
      )}

      {mode === "verify" && (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-secondary/50 p-4 text-xs leading-relaxed text-foreground">
          <Mail className="size-5 text-primary shrink-0 mt-0.5" />
          <p>
            Vui lòng kiểm tra hộp thư đến (và cả mục Spam/Thư rác) của bạn để bấm vào liên kết kích hoạt tài khoản.
            Nếu chưa nhận được email, hãy nhập địa chỉ email bên dưới để yêu cầu gửi lại.
          </p>
        </div>
      )}

      <form method="post" noValidate onSubmit={submit} className="space-y-4" aria-busy={pending}>
        {mode === "register" &&
          field("displayName", "Họ và tên hoặc Biệt danh", "text", "nickname", "Ví dụ: Nguyễn Văn A hoặc Minh An")}

        {field(
          "email",
          "Địa chỉ Email",
          "email",
          "email",
          "email@sinhvien.edu.vn"
        )}

        {mode !== "verify" && (
          <>
            {field(
              "password",
              "Mật khẩu",
              visible ? "text" : "password",
              mode === "register" ? "new-password" : "current-password",
              "••••••••"
            )}

            {mode === "register" && (
              <>
                <p className="text-[11px] text-muted-foreground">
                  Độ dài từ 8 đến 128 ký tự. Nên dùng mật khẩu an toàn và dễ nhớ.
                </p>
                {field(
                  "confirmPassword",
                  "Xác nhận mật khẩu",
                  visible ? "text" : "password",
                  "new-password",
                  "••••••••"
                )}
              </>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                aria-pressed={visible}
                disabled={!ready || pending}
                onClick={() => setVisible(!visible)}
              >
                {visible ? (
                  <>
                    <EyeOff className="size-3.5" />
                    <span>Ẩn mật khẩu</span>
                  </>
                ) : (
                  <>
                    <Eye className="size-3.5" />
                    <span>Hiện mật khẩu</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}

        <div aria-live="polite" aria-atomic="true">
          {message && (
            <div
              role={failed ? "alert" : "status"}
              className={`flex items-start gap-2 rounded-2xl p-3.5 text-xs ${
                failed
                  ? "border border-destructive/20 bg-destructive/10 text-destructive"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-900 font-medium"
              }`}
            >
              {failed ? (
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600" />
              )}
              <span className="leading-relaxed">{message}</span>
            </div>
          )}
        </div>

        <Button
          className="w-full justify-center rounded-xl"
          type="submit"
          disabled={!ready || pending || wait > 0}
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span>Vui lòng chờ…</span>
            </span>
          ) : !ready ? (
            "Đang tải form…"
          ) : wait > 0 ? (
            `Gửi lại sau ${wait}s`
          ) : mode === "register" ? (
            "Tạo tài khoản"
          ) : mode === "login" ? (
            "Đăng nhập"
          ) : (
            "Gửi lại email xác minh"
          )}
        </Button>
      </form>

      <div className="border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
        {mode === "login" ? (
          <p>
            Chưa có tài khoản?{" "}
            <Link
              className="font-bold text-primary hover:underline"
              href={`/register?next=${encodeURIComponent(returnTo)}`}
            >
              Đăng ký ngay
            </Link>
          </p>
        ) : (
          <p>
            Đã có tài khoản?{" "}
            <Link
              className="font-bold text-primary hover:underline"
              href={`/login?next=${encodeURIComponent(returnTo)}`}
            >
              Quay lại đăng nhập
            </Link>
          </p>
        )}

        {mode === "login" && (
          <div className="mt-2">
            <Link
              className="text-muted-foreground hover:text-foreground hover:underline"
              href={`/verify-email?next=${encodeURIComponent(returnTo)}`}
            >
              Chưa nhận được email xác nhận tài khoản?
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
