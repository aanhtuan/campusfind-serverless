"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { MAX_PHOTOS, photoExtension, photoPath } from "./validation";
import { PHOTO_BUCKET, photoOperations, stagedUploads } from "./storage";
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
  return (
    <section aria-labelledby="photos-heading" className="mt-8 rounded-3xl border-2 border-border/80 bg-card p-6 shadow-[4px_4px_0px_0px_rgba(17,24,39,0.06)] sm:p-8">
      <div className="border-b border-border/60 pb-3">
        <h2 id="photos-heading" className="text-xl font-bold text-foreground">
          Hình ảnh đính kèm{" "}
          <span className="text-sm font-semibold text-muted-foreground">({photos.length}/{MAX_PHOTOS})</span>
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Tùy chọn: Định dạng JPEG, PNG hoặc WebP, dung lượng tối đa 5 MiB mỗi ảnh. Hình ảnh sẽ được hiển thị cho thành viên đã đăng nhập.
        </p>
      </div>

      {photos.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, index) => (
            <div key={photo.id} className="min-w-0 rounded-2xl border border-border bg-muted/30 p-3">
              <PrivatePhoto photo={photo} number={index + 1} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || pending.length > 0}
                onClick={() => void remove(photo)}
                aria-label={`Remove report photo ${index + 1}`}
                className="mt-3 w-full text-destructive hover:bg-destructive/10 hover:border-destructive/30"
              >
                Xóa ảnh này
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
          Chưa có hình ảnh nào được tải lên. Tin báo dạng văn bản của bạn đã được lưu an toàn.
        </div>
      )}

      {pending.length > 0 && (
        <div role="alert" className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 text-xs">
          <p className="font-semibold">Xác nhận các tác vụ này trước khi thêm ảnh. Nếu phiên trước bị gián đoạn, bạn có thể tìm lại các tệp tải lên chưa hoàn tất.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pending.map((operation, index) => (
              <Button
                key={operation.path}
                disabled={busy}
                variant="outline"
                size="sm"
                onClick={() => void retry(operation)}
              >
                {operation.kind === "removal" ? "Thử lại thao tác xóa" : "Xác nhận tải lên"} #{index + 1}
              </Button>
            ))}
          </div>
        </div>
      )}

      {photos.length < MAX_PHOTOS && (
        <div className="mt-6 space-y-3 rounded-2xl border border-border bg-secondary/30 p-5">
          <label htmlFor="report-photos" className="block text-sm font-semibold text-foreground">
            Thêm ảnh mới ({MAX_PHOTOS - photos.length} vị trí còn trống)
          </label>
          <input
            ref={fileInput}
            id="report-photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy || pending.length > 0}
            aria-describedby="photo-file-help"
            className="block min-h-11 w-full min-w-0 rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary hover:file:text-white transition-colors"
            onChange={(event) => {
              setSelection(Array.from(event.target.files ?? []));
              setMessage("");
            }}
          />
          <p id="photo-file-help" className="text-xs text-muted-foreground">
            Chọn tối đa {MAX_PHOTOS - photos.length} tệp ảnh cùng lúc. Nếu muốn thay ảnh, hãy xóa ảnh cũ trước.
          </p>
          <Button
            type="button"
            size="default"
            disabled={busy || pending.length > 0 || !selection.length}
            onClick={() => void add()}
            className="rounded-xl"
          >
            {busy ? "Đang xử lý…" : `Tải lên${selection.length ? ` ${selection.length} ảnh` : " ảnh"}`}
          </Button>
        </div>
      )}

      <div className="mt-6 border-t border-border/60 pt-5">
        <Button type="button" variant="outline" disabled={busy || pending.length > 0} onClick={() => void run(async () => {
          const paths = await stagedUploads(createClient(), itemId, ownerId);
          setPending(paths.map(path => ({ path, kind: "upload-cleanup" as const })));
          setMessage(paths.length ? "Đã tìm thấy tệp tải lên cũ chưa được đăng ký. Xác nhận từng tệp ở trên để hoàn tất xử lý." : "Không tìm thấy tệp tải lên cũ chưa hoàn tất trong 100 tệp đầu tiên.");
        })}>Tìm ảnh tải lên chưa hoàn tất</Button>
        <p className="mt-2 text-xs text-muted-foreground">Kiểm tra tối đa 100 tệp cũ nhất của tin báo, được tải lên ít nhất 24 giờ trước. Ảnh đã đăng ký sẽ được giữ lại; hãy hoàn tất tải ảnh ở các tab khác trước khi xử lý.</p>
      </div>
      {message && (
        <p role="status" aria-live="polite" className="mt-4 text-xs font-semibold text-primary">
          {message}
        </p>
      )}
    </section>
  );
}
