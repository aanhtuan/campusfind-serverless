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
  return <section aria-labelledby="item-photos-heading" className="mt-7 rounded-xl border border-primary/15 bg-white p-5 sm:p-7"><h2 id="item-photos-heading" className="text-xl font-semibold">Item photos</h2><p className="mt-2 text-sm text-muted-foreground">Report photos are available only to signed-in members with permission to view this item.</p>
    {view.phase !== "ready" && <div className="mt-5 flex flex-col items-center gap-3 rounded-lg bg-muted p-7 text-center text-sm text-muted-foreground"><ImageOff aria-hidden="true" className="size-8" />{view.phase === "checking" ? <p role="status">Checking photo access…</p> : view.phase === "anonymous" ? <><p>Sign in to view permitted photos.</p><Button asChild variant="outline"><Link href={`/login?next=${encodeURIComponent(`/items/${itemId}`)}`}>Sign in to view photos</Link></Button></> : <><p role="alert">Photos could not be loaded for this session.</p><Button variant="outline" onClick={() => setAttempt(value => value + 1)}>Retry photo access</Button></>}</div>}
    <div ref={frame} hidden={view.phase !== "ready"} className="mt-5">{view.phase === "ready" && (view.photos.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{view.photos.map((photo, index) => <AuthorizedPhoto key={`${view.userId}:${photo.id}`} photo={photo} number={index + 1} />)}</div> : <p className="rounded-lg bg-muted p-5 text-sm text-muted-foreground">No photos have been attached to this report.</p>)}</div>
  </section>;
}
