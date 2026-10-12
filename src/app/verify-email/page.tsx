import { AuthPage } from "@/features/auth/auth-page";

export const dynamic = "force-dynamic";

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AuthPage mode="verify" searchParams={searchParams} />;
}
