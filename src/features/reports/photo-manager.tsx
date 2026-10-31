"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { MAX_PHOTOS, photoExtension, photoPath } from "./validation";
import { PHOTO_BUCKET, photoOperations } from "./storage";
import { reconcileUpload, removePhoto, uploadPhoto, type PendingPhoto, type PhotoOperations } from "./photo-lifecycle";
import type { ItemPhoto } from "./types";

function PrivatePhoto({ photo, number }: { photo: ItemPhoto; number: number }) {
  const [source, setSource] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;
    const client = createClient();
    const { data: { subscription } } = client.auth.onAuthStateChange(event => {
      if (event === "SIGNED_OUT") { disposed = true; if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = null; setSource(null); }
    });
    void (async () => {
      try {
        const { data, error } = await client.storage.from(PHOTO_BUCKET).download(photo.storage_path);
        if (disposed) return;
        if (error || !data) { setFailed(true); return; }
        objectUrl = URL.createObjectURL(data); setSource(objectUrl); setFailed(false);
      } catch { if (!disposed) setFailed(true); }
    })();
    return () => { disposed = true; if (objectUrl) URL.revokeObjectURL(objectUrl); subscription.unsubscribe(); };
  }, [photo.storage_path, attempt]);
  // Session-authorized Blob URLs must not pass through a public image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return source ? <img src={source} alt={`Report photo ${number}`} className="aspect-[4/3] w-full rounded-lg bg-muted object-contain" /> : <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">{failed ? <>Photo could not be loaded.<Button variant="outline" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>Retry photo</Button></> : <span role="status">Loading photo…</span>}</div>;
}

export function PhotoManager({ itemId, ownerId, photos }: { itemId: string; ownerId: string; photos: ItemPhoto[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [selection, setSelection] = useState<File[]>([]);
  async function run(work: (operations: PhotoOperations) => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage("");
    try { await work(await photoOperations(createClient(), itemId, ownerId)); }
    catch { setMessage("Photo changes could not be confirmed. Check your session and reload before retrying."); }
    finally { lock.current = false; setBusy(false); router.refresh(); }
  }
  async function add() {
    await run(async operations => {
      if (!selection.length || selection.length + photos.length > MAX_PHOTOS) { setMessage("Choose between one and the remaining number of photos (three total)."); return; }
      try {
        for (const file of selection) { photoExtension(file); const image = await createImageBitmap(file); image.close(); }
      } catch { setMessage("Choose readable JPEG, PNG or WebP images, each no larger than 5 MiB."); return; }
      let saved = 0;
      const unresolved: PendingPhoto[] = [];
      for (const file of selection) {
        const path = photoPath(ownerId, itemId, crypto.randomUUID(), photoExtension(file));
        const result = await uploadPhoto(operations, path, file);
        if (result.ok) saved++;
        else if (result.pending) unresolved.push(result.pending);
      }
      setPending(current => [...current, ...unresolved]);
      setMessage(`${saved} of ${selection.length} photos saved. Your report is safe.${unresolved.length ? " Reconcile uncertain operations below before uploading more." : saved < selection.length ? " Unregistered staged uploads were removed; select failed photos again." : ""}`);
      setSelection([]); if (fileInput.current) fileInput.current.value = "";
    });
  }
  async function remove(photo: ItemPhoto) {
    await run(async operations => {
      const result = await removePhoto(operations, photo);
      if (result.ok) setMessage("Photo removed.");
      else { setMessage(result.message); const recovery = result.pending; if (recovery) setPending(current => [...current.filter(p => p.path !== recovery.path), recovery]); }
    });
  }
  async function retry(operation: PendingPhoto) {
    await run(async operations => {
      const result = operation.kind === "removal" && operation.photo ? await removePhoto(operations, operation.photo) : await reconcileUpload(operations, operation.path);
      setPending(current => current.filter(p => p.path !== operation.path).concat(!result.ok && result.pending ? [result.pending] : []));
      setMessage(result.ok ? "Photo operation confirmed." : result.message);
    });
  }
  return <section aria-labelledby="photos-heading" className="mt-8 rounded-xl border border-primary/15 bg-white p-5 sm:p-7">
    <h2 id="photos-heading" className="text-xl font-semibold">Report photos <span className="text-base font-normal text-muted-foreground">({photos.length}/3)</span></h2>
    <p className="mt-2 text-sm text-muted-foreground">Optional: JPEG, PNG or WebP, up to 5 MiB each. Photos on active reports can be viewed by other signed-in members. Do not upload confidential evidence or unredacted identity documents.</p>
    {photos.length ? <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{photos.map((photo, index) => <div key={photo.id} className="min-w-0"><PrivatePhoto photo={photo} number={index + 1} /><Button type="button" variant="outline" disabled={busy || pending.length > 0} onClick={() => void remove(photo)} aria-label={`Remove report photo ${index + 1}`} className="mt-3 w-full">Remove photo</Button></div>)}</div> : <p className="mt-5 rounded-lg bg-muted p-4 text-sm">No photos yet. Your text report is already saved.</p>}
    {pending.length > 0 && <div role="alert" className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4"><p className="text-sm">Finish these operations before leaving this page. Recovery details are kept in this tab only.</p>{pending.map((operation, index) => <Button key={operation.path} disabled={busy} variant="outline" onClick={() => void retry(operation)} className="mt-3 mr-2">{operation.kind === "removal" ? "Retry removal" : "Reconcile upload"} {index + 1}</Button>)}</div>}
    {photos.length < MAX_PHOTOS && <div className="mt-6 space-y-3"><label htmlFor="report-photos" className="block font-medium">Add photos ({MAX_PHOTOS - photos.length} remaining)</label><input ref={fileInput} id="report-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || pending.length > 0} aria-describedby="photo-file-help" className="block min-h-11 w-full min-w-0 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-3 file:text-primary" onChange={event => { setSelection(Array.from(event.target.files ?? [])); setMessage(""); }} /><p id="photo-file-help" className="text-sm text-muted-foreground">Choose up to {MAX_PHOTOS - photos.length} files. To replace a photo, remove it first.</p><Button type="button" disabled={busy || pending.length > 0 || !selection.length} onClick={() => void add()}>{busy ? "Working…" : `Upload${selection.length ? ` ${selection.length} photo${selection.length === 1 ? "" : "s"}` : " photos"}`}</Button></div>}
    {message && <p role="status" aria-live="polite" className="mt-4 text-sm">{message}</p>}
  </section>;
}
