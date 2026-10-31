import type { ItemPhoto } from "./types";

export type PhotoOperations = {
  upload(path: string, file: File): Promise<void>;
  find(path: string): Promise<ItemPhoto | null>;
  register(path: string): Promise<ItemPhoto>;
  removeMetadata(photo: ItemPhoto): Promise<void>;
  removeObject(path: string): Promise<void>;
};
export type PendingPhoto = { path: string; kind: "upload-cleanup" | "removal"; photo?: ItemPhoto };
export type PhotoResult = { ok: true; photo?: ItemPhoto } | { ok: false; message: string; pending?: PendingPhoto };

// A failed HTTP response can follow a committed database write. Reconcile by
// unique path before removing anything; never delete an already registered photo.
export async function reconcileUpload(ops: PhotoOperations, path: string): Promise<PhotoResult> {
  try {
    const registered = await ops.find(path);
    if (registered) return { ok: true, photo: registered };
    await ops.removeObject(path);
    return { ok: false, message: "Photo was not registered. Its staged upload was removed; you can select it again." };
  } catch {
    return { ok: false, message: "Photo outcome is uncertain. Retry reconciliation before adding more images.", pending: { path, kind: "upload-cleanup" } };
  }
}
export async function uploadPhoto(ops: PhotoOperations, path: string, file: File): Promise<PhotoResult> {
  try {
    await ops.upload(path, file);
    return { ok: true, photo: await ops.register(path) };
  } catch {
    return reconcileUpload(ops, path);
  }
}
export async function removePhoto(ops: PhotoOperations, photo: ItemPhoto): Promise<PhotoResult> {
  try {
    const current = await ops.find(photo.storage_path);
    if (current) await ops.removeMetadata(current);
    // Only remove the exact owner-scoped object after metadata absence is known.
    if (await ops.find(photo.storage_path)) throw new Error("Metadata removal is unconfirmed");
    await ops.removeObject(photo.storage_path);
    return { ok: true };
  } catch {
    return { ok: false, message: "Removal is not confirmed. Retry to finish removing this photo.", pending: { path: photo.storage_path, kind: "removal", photo } };
  }
}
