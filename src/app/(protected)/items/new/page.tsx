import { requireUser } from "@/features/auth/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireUser("/items/new");
  return <main className="mx-auto max-w-4xl px-6 py-12"><h1 className="text-3xl font-semibold">New report</h1></main>;
}
