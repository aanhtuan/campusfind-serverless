import type { ClaimWithItem } from "./types";

// Record identities stay stable; custody roles depend on the report type.
export function participants(claim: ClaimWithItem) {
  const lost = claim.items.type === "LOST";
  return { lost, holderId: lost ? claim.claimant_id : claim.items.reporter_id,
    ownerId: lost ? claim.items.reporter_id : claim.claimant_id,
    verified: !lost || Boolean(claim.ownership_verified_at) };
}
