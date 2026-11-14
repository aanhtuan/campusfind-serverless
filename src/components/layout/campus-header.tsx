"use client";

import Link from "next/link";
import { accountCode } from "@/features/identity/actors";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FileText,
  Inbox,
  ShieldCheck,
  HeartHandshake,
  LayoutDashboard,
  MapPin,
  Menu,
  PlusCircle,
  Search,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "@/features/auth/logout-button";
import { cn } from "@/lib/utils";

interface CampusHeaderProps {
  authenticated?: boolean;
  userEmail?: string | null;
  displayName?: string | null;
}

export function CampusHeader({
  authenticated = false,
  userEmail,
  displayName
}: CampusHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [identity, setIdentity] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    if (!authenticated) return;
    const client = createClient();
    let disposed = false;
    let generation = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const check = async () => {
      const ticket = ++generation;
      try {
        const { data, error } = await client.auth.getUser();
        const profile = !error && data.user ? await client.from("profiles").select("role,display_name").eq("id", data.user.id).maybeSingle() : null;
        if (!disposed && ticket === generation) {
          setAdmin(!profile?.error && profile?.data?.role === "ADMIN");
          setIdentity(!error && data.user ? { id: data.user.id, name: profile?.data?.display_name?.trim() || "Thành viên" } : null);
        }
      } catch { if (!disposed && ticket === generation) { setAdmin(false); setIdentity(null); } }
    };
    const schedule = () => {
      const timer = setTimeout(() => { timers.delete(timer); void check(); }, 0);
      timers.add(timer);
    };
    schedule();
    const { data: { subscription } } = client.auth.onAuthStateChange(event => {
      if (event === "SIGNED_OUT") { generation++; setAdmin(false); setIdentity(null); }
      else if (event === "SIGNED_IN" || event === "USER_UPDATED") schedule();
    });
    return () => { disposed = true; generation++; timers.forEach(clearTimeout); subscription.unsubscribe(); };
  }, [authenticated]);

  const navLinks = [
    {
      href: "/items",
      label: "Tìm & Xem đồ",
      enLabel: "Browse items",
      icon: Search,
      active: pathname === "/items" || pathname.startsWith("/items/"),
    },
    {
      href: "/items/new",
      label: "Báo mất / Báo nhặt",
      enLabel: "Report item",
      icon: PlusCircle,
      active: pathname === "/items/new",
      highlight: true,
    },
  ];

  const authNavLinks = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      href: "/my-reports",
      label: "Báo cáo của tôi",
      icon: FileText,
      active: pathname.startsWith("/my-reports"),
    },
    {
      href: "/my-claims",
      label: "Yêu cầu & phản hồi",
      icon: HeartHandshake,
      active: pathname.startsWith("/my-claims") || pathname.startsWith("/claims"),
    },
    { href: "/incoming-claims", label: "Phản hồi gửi đến", icon: Inbox, active: pathname.startsWith("/incoming-claims") },
    ...(authenticated && admin ? [{ href: "/admin", label: "Quản trị", icon: ShieldCheck, active: pathname.startsWith("/admin") }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 flex-wrap px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-2xl transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Trang chủ CampusFind"
        >
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground border-2 border-primary/20 shadow-[2px_2px_0px_0px_rgba(79,70,229,0.3)] transition-transform group-hover:-rotate-3">
            <MapPin aria-hidden="true" className="size-5 stroke-[2.4]" />
          </div>
          <div>
            <span className="flex items-center gap-1 text-lg font-black tracking-tight text-foreground sm:text-xl">
              CampusFind
              <span className="inline-block size-2 rounded-full bg-amber-400 ring-2 ring-primary/20" />
            </span>
            <p className="hidden text-[11px] font-bold tracking-wide text-muted-foreground sm:block">
              Đồ thất lạc trường học
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav
          aria-label="Điều hướng chính"
          className={cn("hidden items-center gap-2 lg:flex", authenticated && "order-3 w-full flex-wrap border-t border-border/60 pt-3")}
        >
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  link.active
                    ? "bg-secondary text-primary border border-primary/25 shadow-[1.5px_1.5px_0px_0px_rgba(79,70,229,0.2)]"
                    : "text-foreground/80 hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <Icon aria-hidden="true" className="size-4 stroke-[2.2]" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          {authenticated && (
            <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          )}

          {authenticated &&
            authNavLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    link.active
                      ? "bg-secondary text-primary border border-primary/25 shadow-[1.5px_1.5px_0px_0px_rgba(79,70,229,0.2)]"
                      : "text-foreground/75 hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  <Icon aria-hidden="true" className="size-4 stroke-[2.2]" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
        </nav>

        {/* Desktop Auth CTAs */}
        <div className="ml-auto hidden items-center gap-2.5 lg:flex">
          {authenticated ? (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link href="/dashboard" className="gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="max-w-[130px] truncate">
                    {identity?.name || displayName || userEmail?.split("@")[0] || "Tài khoản"}
                  </span>
                </Link>
              </Button>
              <LogoutButton />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="rounded-xl">
                <Link href="/login">Đăng nhập</Link>
              </Button>
              <Button asChild variant="default" size="sm" className="rounded-xl">
                <Link href="/register">Tạo tài khoản</Link>
              </Button>
            </div>
          )}
        </div>

        {authenticated && identity && <Link href="/dashboard" className="order-3 w-full rounded-xl bg-secondary/60 px-3 py-2 text-xs [overflow-wrap:anywhere]" aria-label="Tài khoản đang đăng nhập">
          Đang đăng nhập: <strong>{identity.name}</strong> · {accountCode(identity.id)}
        </Link>}

        {/* Mobile Hamburger Button */}
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu điều hướng"}
            className="rounded-xl"
          >
            {mobileMenuOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng di động"
          className="border-b border-border bg-card px-4 pt-3 pb-6 shadow-md w-full lg:hidden"
        >
          <nav className="flex flex-col gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-xl px-4 text-base font-medium transition-colors",
                    link.active
                      ? "bg-secondary text-primary font-semibold"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <Icon aria-hidden="true" className="size-5 text-primary" />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {authenticated && (
              <>
                <div className="my-2 border-t border-border" />
                <p className="px-4 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Khu vực cá nhân
                </p>
                {authNavLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-xl px-4 text-base font-medium transition-colors",
                        link.active
                          ? "bg-secondary text-primary font-semibold"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <Icon aria-hidden="true" className="size-5 text-primary" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </>
            )}

            <div className="my-2 border-t border-border" />

            {authenticated ? (
              <div className="space-y-2 pt-1">
                <Button asChild className="w-full justify-center">
                  <Link href="/items/new" onClick={() => setMobileMenuOpen(false)}>
                    <PlusCircle aria-hidden="true" className="size-4" />
                    Đăng tin báo mới
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-center">
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    Vào Dashboard
                  </Link>
                </Button>
                <LogoutButton />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button asChild variant="outline" className="justify-center">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    Đăng nhập
                  </Link>
                </Button>
                <Button asChild variant="default" className="justify-center">
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    Đăng ký
                  </Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
