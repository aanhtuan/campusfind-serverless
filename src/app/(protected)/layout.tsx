import type { ReactNode } from "react";
import { requireUser } from "@/features/auth/server";
import { ProtectedSession } from "@/features/auth/protected-session";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("/dashboard");
  return <ProtectedSession userId={user.id}>{children}</ProtectedSession>;
}
