import type { SupabaseClient } from "@supabase/supabase-js";
import type { PhotoOperations } from "./photo-lifecycle";
import { ownReport, verifiedReporter } from "./services";
import { photoFields, type ItemPhoto } from "./types";
import { photoPath, reportId } from "./validation";

export const PHOTO_BUCKET = "item-images";
export async function photoOperations(client: SupabaseClient, itemId: string, expectedOwner: string): Promise<PhotoOperations> {
  const owner = await verifiedReporter(client);
  if (owner !== expectedOwner || !await ownReport(client, owner, itemId)) throw new Error("This report is unavailable in your account.");
  const scoped = (path: string) => {
    const [user, item, name, extra] = path.split("/");
    const match = /^([0-9a-f-]+)\.(jpg|jpeg|png|webp)$/.exec(name ?? "");
    if (extra || user !== owner || item !== itemId || !match || photoPath(owner, itemId, match[1], match[2]) !== path) throw new Error("Invalid photo path.");
  };
  return {
    async upload(path, file) {
      scoped(path);
      const { error } = await client.storage.from(PHOTO_BUCKET).upload(path, file, { upsert: false, contentType: file.type, cacheControl: "0" });
      if (error) throw new Error("Upload failed.");
    },
    async find(path) {
      scoped(path);
      const { data, error } = await client.from("item_images").select(photoFields).eq("item_id", itemId).eq("storage_path", path).maybeSingle();
      if (error) throw new Error("Unable to confirm photo registration.");
      return data as ItemPhoto | null;
    },
    async register(path) {
      scoped(path);
      const { data, error } = await client.from("item_images").insert({ item_id: itemId, storage_path: path }).select(photoFields).single();
      if (error || !data) throw new Error("Photo registration failed.");
      return data as ItemPhoto;
    },
    async removeMetadata(photo) {
      scoped(photo.storage_path); reportId.parse(photo.id);
      const { error } = await client.from("item_images").delete().eq("id", photo.id).eq("item_id", itemId).eq("storage_path", photo.storage_path);
      if (error) throw new Error("Unable to remove photo registration.");
    },
    async removeObject(path) {
      scoped(path);
      const { error } = await client.storage.from(PHOTO_BUCKET).remove([path]);
      if (error) throw new Error("Unable to remove staged object.");
    },
  };
}
