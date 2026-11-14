import type { ItemReport } from "@/features/reports/types";
export type Claim = {
  id: string; item_id: string; claimant_id: string; proof_text: string;
  owner_proof_text: string | null; owner_proof_submitted_at: string | null; ownership_verified_at: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  created_at: string; updated_at: string;
};
export type ClaimWithItem = Claim & { items: ItemReport; actors?: import("@/features/identity/actors").ActorLabels };
export type Handover = {
  claim_id: string; location: string; meeting_at: string; revision: number;
  proposed_by: string; accepted_by: string | null; accepted_at: string | null; change_requested: boolean;
  reporter_confirmed_at: string | null; claimant_confirmed_at: string | null;
};
export type Contact = { user_id: string; kind: "EMAIL" | "PHONE"; value: string; consented_at: string };
export type WorkflowIssue = {
  id: string; claim_id: string; category: string; status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  reporter_resumed_at: string | null; claimant_resumed_at: string | null; created_at: string;
};
