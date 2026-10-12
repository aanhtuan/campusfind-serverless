import { notFound } from "next/navigation";
import { requireUser } from "@/features/auth/server";
import { ProtectedSession } from "@/features/auth/protected-session";
import { DevelopmentValidation } from "@/features/auth/development-validation";

export const dynamic = "force-dynamic";
export default async function Page() {
  // No diagnostics surface in a production build; no Cloud settings are changed.
  if (process.env.NODE_ENV !== "development") notFound();
  const user = await requireUser("/dashboard");
  return <ProtectedSession userId={user.id}><DevelopmentValidation /></ProtectedSession>;
}
