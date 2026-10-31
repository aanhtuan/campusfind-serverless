export type ItemReport = {
  id: string; reporter_id: string; type: "LOST" | "FOUND"; title: string;
  description: string | null; category: string; location: string; event_date: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  created_at: string; updated_at: string;
};
export type ItemPhoto = { id: string; item_id: string; storage_path: string; image_slot: number };
export const reportFields = "id,reporter_id,type,title,description,category,location,event_date,status,created_at,updated_at";
export const photoFields = "id,item_id,storage_path,image_slot";
export const PAGE_SIZE = 20;
