"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { ItemPhoto } from "@/features/reports/types";
import { PHOTO_BUCKET } from "@/features/reports/storage";
import { visiblePhotos } from "./services";
import { createPhotoAccess } from "./photo-access";

function AuthorizedPhoto({ photo, number }: { photo: ItemPhoto; number: number }) {
  const [source, setSource] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let objectUrl: string | null = null;
    void (async () => {
      try {
        const { data, error } = await createClient().storage.from(PHOTO_BUCKET).download(photo.storage_path, {}, { signal: controller.signal, cache: "no-store" });
        if (disposed) return;
        if (error || !data) { setFailed(true); return; }
        objectUrl = URL.createObjectURL(data); setSource(objectUrl); setFailed(false);
      } catch { if (!disposed) setFailed(true); }
    })();
    return () => { disposed = true; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [photo.storage_path, attempt]);
  // Private Blob images must not pass through a shared/public image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return source ? <img src={source} alt={`Item photo ${number}`} className="aspect-[4/3] w-full rounded-lg bg-muted object-contain" /> : <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-lg bg-muted p-4 text-sm text-muted-foreground">{failed ? <>Photo unavailable.<Button variant="outline" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>Retry photo {number}</Button></> : <span role="status">Loading photo…</span>}</div>;
}
type View = { phase: "checking" | "anonymous" | "ready" | "error"; userId: string | null; photos: ItemPhoto[] };
export function DiscoveryPhotos({ itemId }: { itemId: string }) {
  const [view, setView] = useState<View>({ phase: "checking", userId: null, photos: [] });
  const [attempt, setAttempt] = useState(0);
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let client: ReturnType<typeof createClient>;
    const clear = (phase: View["phase"]) => { if (frame.current) frame.current.hidden = true; setView({ phase, userId: null, photos: [] }); };
    try { client = createClient(); } catch { clear("error"); return; }
    const access = createPhotoAccess({
      verify: async () => { const { data, error } = await client.auth.getUser(); return error ? null : data.user?.id ?? null; },
      load: () => visiblePhotos(client, itemId),
      onPending: () => clear("checking"), onAnonymous: () => clear("anonymous"), onError: () => clear("error"),
      onReady: (userId, photos) => setView({ phase: "ready", userId, photos }),
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => { if (timer) clearTimeout(timer); access.suspend(); if (document.visibilityState !== "hidden") timer = setTimeout(() => { void access.check(); }, 0); };
    const { data: { subscription } } = client.auth.onAuthStateChange(event => {
      if (event === "SIGNED_OUT") { if (timer) clearTimeout(timer); access.signOut(); } else schedule();
    });
    const suspend = () => { if (timer) clearTimeout(timer); access.suspend(); };
    const visibility = () => { if (document.visibilityState === "hidden") suspend(); else schedule(); };
    window.addEventListener("pageshow", schedule); window.addEventListener("focus", schedule); window.addEventListener("pagehide", suspend); document.addEventListener("visibilitychange", visibility);
    void access.check();
    return () => { if (timer) clearTimeout(timer); access.dispose(); subscription.unsubscribe(); window.removeEventListener("pageshow", schedule); window.removeEventListener("focus", schedule); window.removeEventListener("pagehide", suspend); document.removeEventListener("visibilitychange", visibility); };
  }, [itemId, attempt]);
  useEffect(() => { if (frame.current) frame.current.hidden = view.phase !== "ready"; }, [view]);
  return (
    <section aria-labelledby="item-photos-heading" className="mt-8 rounded-3xl border-2 border-border/80 bg-card p-6 shadow-[4px_4px_0px_0px_rgba(17,24,39,0.06)] sm:p-8">
      <div className="border-b border-border/60 pb-3">
        <h2 id="item-photos-heading" className="text-xl font-bold text-foreground">
          Hình ảnh món đồ
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Hình ảnh đính kèm chỉ hiển thị cho thành viên đã đăng nhập nhằm bảo vệ quyền riêng tư.
        </p>
      </div>

      {view.phase !== "ready" && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-muted/60 p-8 text-center text-sm text-muted-foreground">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-card text-muted-foreground shadow-2xs">
            <ImageOff aria-hidden="true" className="size-6 text-muted-foreground/70" />
          </div>
          {view.phase === "checking" ? (
            <p role="status" className="font-medium">Đang kiểm tra quyền xem ảnh…</p>
          ) : view.phase === "anonymous" ? (
            <div className="space-y-3">
              <p className="font-medium text-foreground">Đăng nhập tài khoản trường để xem hình ảnh đính kèm.</p>
              <Button asChild variant="default" size="sm">
                <Link href={`/login?next=${encodeURIComponent(`/items/${itemId}`)}`}>
                  Đăng nhập để xem ảnh
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p role="alert" className="text-destructive font-medium">Không thể tải ảnh cho phiên làm việc hiện tại.</p>
              <Button variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>
                Thử lại quyền truy cập ảnh
              </Button>
            </div>
          )}
        </div>
      )}

      <div ref={frame} hidden={view.phase !== "ready"} className="mt-6">
        {view.phase === "ready" &&
          (view.photos.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {view.photos.map((photo, index) => (
                <AuthorizedPhoto key={`${view.userId}:${photo.id}`} photo={photo} number={index + 1} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Người đăng không đính kèm hình ảnh cho tin báo này.
            </div>
          ))}
      </div>
    </section>
  );
}
