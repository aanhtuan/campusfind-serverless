const FALLBACK = "/dashboard";
const BASE = "https://campusfind.invalid";
const protectedRoots = ["/dashboard", "/items/new", "/my-reports", "/my-claims"];

export function isProtectedPath(pathname: string): boolean {
  return protectedRoots.some(root => pathname === root || pathname.startsWith(`${root}/`));
}

export function safeReturnPath(value: string | null | undefined): string {
  if (!value || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return FALLBACK;
  try {
    const url = new URL(value, BASE);
    // Reject encoded path delimiters/dot segments instead of decoding redirects.
    if (url.origin !== BASE || url.pathname.includes("%") || value.split(/[?#]/)[0].split("/").some(p => p === "." || p === "..")) return FALLBACK;
    const allowed = url.pathname === "/" || isProtectedPath(url.pathname) || url.pathname === "/items" || url.pathname.startsWith("/items/");
    return allowed ? `${url.pathname}${url.search}` : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

export function getAppOrigin(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL || (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "");
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error();
    return url.origin;
  } catch {
    throw new Error("Set NEXT_PUBLIC_SITE_URL to the trusted application origin (HTTPS, or HTTP localhost for development).");
  }
}

export function loginDestination(returnTo: string, reason?: "confirmation_failed" | "configuration_missing"): URL {
  const url = new URL("/login", getAppOrigin());
  url.searchParams.set("next", safeReturnPath(returnTo));
  if (reason) url.searchParams.set("reason", reason);
  return url;
}
