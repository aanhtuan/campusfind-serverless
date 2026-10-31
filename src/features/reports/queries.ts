import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/features/auth/server";
import { createClient } from "@/lib/supabase/server";
import { ownReport } from "./services";
import { reportId } from "./validation";

export async function requireOwnedReport(id: string, returnTo: string) {
  const user = await requireUser(returnTo);
  if (!reportId.safeParse(id).success) notFound();
  const client = await createClient();
  const report = await ownReport(client, user.id, id);
  if (!report) notFound();
  return { user, client, report };
}
