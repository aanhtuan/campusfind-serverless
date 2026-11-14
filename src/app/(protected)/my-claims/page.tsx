import { ClaimList } from "@/features/workflow/claim-list";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  return <ClaimList incoming={false} rawPage={(await searchParams).page} />;
}
