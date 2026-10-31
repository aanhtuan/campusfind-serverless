import { z } from "zod";

export const categories = ["Electronics", "Documents", "Keys", "Bags", "Clothing", "Accessories", "Other"];
export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const reportId = z.uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.").refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !value.startsWith("0000") && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Choose a valid calendar date.");
const fields = {
  title: z.string().trim().min(1, "Enter a title.").max(200),
  description: z.string().max(5000).transform(value => value.trim() || null).nullable(),
  category: z.string().trim().min(1, "Enter a category.").max(80),
  location: z.string().trim().min(1, "Enter a campus location.").max(200),
  event_date: date,
};
export const editReportSchema = z.strictObject(fields);
export const createReportSchema = z.strictObject({ type: z.enum(["LOST", "FOUND"]), ...fields });
export type ReportInput = z.input<typeof createReportSchema>;
export type ReportEdit = z.input<typeof editReportSchema>;

export function photoExtension(file: { size: number; type: string }) {
  if (file.size < 1 || file.size > MAX_PHOTO_BYTES) throw new Error("Choose a non-empty image no larger than 5 MiB.");
  const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[file.type];
  if (!extension) throw new Error("Choose a JPEG, PNG or WebP image.");
  return extension;
}
export function photoPath(owner: string, item: string, fileId: string, extension: string) {
  for (const id of [owner, item, fileId]) reportId.parse(id);
  if (!["jpg", "jpeg", "png", "webp"].includes(extension)) throw new Error("Unsupported image extension.");
  return `${owner.toLowerCase()}/${item.toLowerCase()}/${fileId.toLowerCase()}.${extension}`;
}
export function pageNumber(value: unknown) {
  return typeof value === "string" && /^[1-9]\d{0,5}$/.test(value) ? Number(value) : 1;
}
