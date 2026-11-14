import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowRight, Inbox, LogIn, Sparkles } from "lucide-react";
import { ProtectedSession } from "@/features/auth/protected-session";
import { Button } from "@/components/ui/button";
import type { DiscoveryItem } from "@/features/discovery/services";

export async function ClaimEntry({
  client,
  item,
  userId,
}: {
  client: SupabaseClient;
  item: DiscoveryItem;
  userId: string | null;
}) {
  const lost = item.type === "LOST";

  if (!userId) {
    return item.status === "OPEN" ? (
      <Button asChild size="lg" className="mt-6 gap-2">
        <Link href={`/login?next=${encodeURIComponent(`/claims/new?item=${item.id}`)}`}>
          <LogIn className="size-4" />
          <span>
            {lost ? "Đăng nhập để phản hồi nhặt được đồ" : "Đăng nhập để yêu cầu nhận đồ"}
          </span>
        </Link>
      </Button>
    ) : null;
  }

  const [owned, existing] = await Promise.all([
    client
      .from("items")
      .select("id")
      .eq("id", item.id)
      .eq("reporter_id", userId)
      .maybeSingle(),
    client
      .from("claims")
      .select("id,status")
      .eq("item_id", item.id)
      .eq("claimant_id", userId)
      .in("status", ["PENDING", "APPROVED"])
      .maybeSingle(),
  ]);

  if (owned.error || existing.error) {
    return (
      <p role="alert" className="mt-5 text-xs text-muted-foreground">
        Chưa tải được trạng thái yêu cầu nhận đồ. Vui lòng tải lại trang.
      </p>
    );
  }

  if (owned.data) {
    return (
      <Button asChild variant="outline" size="lg" className="mt-6 gap-2">
        <Link href="/incoming-claims">
          <Inbox className="size-4 text-primary" />
          <span>
            {lost ? "Xem phản hồi nhặt được đồ" : "Xem yêu cầu gửi đến tin của tôi"}
          </span>
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    );
  }

  if (!existing.data && item.status !== "OPEN") return null;

  return (
    <ProtectedSession userId={userId}>
      <Button asChild size="lg" className="mt-6 gap-2">
        <Link
          href={
            existing.data
              ? `/claims/${existing.data.id}`
              : `/claims/new?item=${item.id}`
          }
        >
          <Sparkles className="size-4 text-amber-300" />
          <span>
            {existing.data
              ? lost
                ? "Theo dõi phản hồi nhặt được đồ"
                : "Theo dõi yêu cầu nhận đồ"
              : lost
              ? "Tôi có thể đã nhặt được đồ này"
              : "Gửi yêu cầu nhận đồ này"}
          </span>
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </ProtectedSession>
  );
}
